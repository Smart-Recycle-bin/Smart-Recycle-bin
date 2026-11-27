import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/storage/token_storage.dart';
import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/scan_session/data/models/disposal_session_model.dart';
import 'package:ecobin/features/scan_session/domain/entities/disposal_session_entity.dart';
import 'package:ecobin/features/scan_session/domain/repositories/session_repository.dart';
import 'package:ecobin/features/scan_session/presentation/viewmodels/active_session_viewmodel.dart';
import 'package:ecobin/features/survey/data/datasources/survey_remote_data_source.dart';
import 'package:ecobin/features/survey/data/models/survey_item_model.dart';
import 'package:ecobin/features/survey/domain/entities/survey_entity.dart';
import 'package:ecobin/features/survey/domain/entities/survey_item_entity.dart';
import 'package:ecobin/features/survey/domain/repositories/survey_repository.dart';
import 'package:ecobin/features/survey/presentation/viewmodels/verify_survey_viewmodel.dart';
import 'package:ecobin/features/survey/presentation/views/verify_survey_view.dart';

class _EmptySurveyRepo implements SurveyRepository {
  @override
  Future<Result<SurveyEntity>> getSurveyDetails(String surveyId) async {
    return const Result.success(
      SurveyEntity(
        surveyId: '1',
        surveyNumber: 1,
        sessionId: '1',
        binId: '1',
        binName: 'Bin#001',
        status: 'done',
        points: 0,
        timeAgo: 'Just now',
        items: [],
      ),
    );
  }

  @override
  Future<Result<List<SurveyEntity>>> getSurveys({String status = 'all'}) async =>
      const Result.success([]);

  @override
  Future<Result<int>> submitSurvey({
    required String surveyId,
    String? sessionId,
    required List<SurveyItemEntity> items,
    int? aiRating,
  }) async =>
      const Result.success(0);
}

class _TestAdapter implements HttpClientAdapter {
  final Future<ResponseBody> Function(RequestOptions options) handler;
  _TestAdapter(this.handler);

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) =>
      handler(options);

  @override
  void close({bool force = false}) {}
}

class FakeSessionRepository implements SessionRepository {
  DisposalSessionEntity nextStatus;

  FakeSessionRepository()
      : nextStatus = const DisposalSessionEntity(
          sessionId: '42',
          binId: '1',
          binName: 'Bin#001',
          status: 'active',
          totalPoints: 0,
          countdownSeconds: 60,
          items: [],
        );

  @override
  Future<Result<DisposalSessionEntity>> startSession({
    required String binId,
    required String qrPayload,
  }) async {
    return Result.success(nextStatus);
  }

  @override
  Future<Result<DisposalSessionEntity>> getSessionStatus(String sessionId) async {
    return Result.success(nextStatus);
  }

  @override
  Future<Result<DisposalSessionEntity>> endSession(String sessionId) async {
    return Result.success(
      DisposalSessionEntity(
        sessionId: nextStatus.sessionId,
        binId: nextStatus.binId,
        binName: nextStatus.binName,
        status: 'terminated',
        surveyId: '18',
        totalPoints: nextStatus.totalPoints,
        countdownSeconds: 0,
        items: nextStatus.items,
      ),
    );
  }
}

void main() {
  test('DisposalSessionModel safely parses backend integer IDs and surveyId', () {
    final model = DisposalSessionModel.fromJson({
      'sessionId': 42,
      'binId': 2,
      'binName': 'Bin#002',
      'status': 'terminated',
      'surveyId': 18,
      'countdownSeconds': 0,
      'totalPoints': 35,
      'items': [
        {
          'itemId': 101,
          'wasteType': 'METAL',
          'estimatedPoints': 20,
        },
      ],
    });

    expect(model.sessionId, '42');
    expect(model.binId, '2');
    expect(model.surveyId, '18');
    expect(model.totalPoints, 35);
    expect(model.items.single.itemId, '101');
    expect(model.items.single.points, 20);
  });

  test('ActiveSessionViewModel syncs live bin items, resets countdown, and ends session', () async {
    final repo = FakeSessionRepository();
    final vm = ActiveSessionViewModel(sessionRepository: repo);
    addTearDown(vm.dispose);

    final started = await vm.startSession('BIN-101', 'BIN-101');
    expect(started, true);
    expect(vm.remainingSeconds, 60);
    expect(vm.currentSession?.items.length, 0);

    // Hardware bin uploads a photo -> backend classifies METAL (+20) and extends window to 60s.
    repo.nextStatus = const DisposalSessionEntity(
      sessionId: '42',
      binId: '1',
      binName: 'Bin#001',
      status: 'active',
      totalPoints: 20,
      countdownSeconds: 60,
      items: [
        DetectedItemEntity(itemId: '101', wasteType: 'METAL', points: 20),
      ],
    );
    await vm.syncSessionStatus();

    expect(vm.currentSession?.items.length, 1);
    expect(vm.currentSession?.totalPoints, 20);
    expect(vm.remainingSeconds, 60);

    final ended = await vm.endSession();
    expect(ended, true);
    expect(vm.currentSession?.isActive, false);
    expect(vm.currentSession?.surveyId, '18');
  });

  test('SurveyRemoteDataSourceImpl calls /survey/confirm when untouched and /submit when corrected', () async {
    SharedPreferences.setMockInitialValues({});
    final prefs = await SharedPreferences.getInstance();
    final apiClient = ApiClient(tokenStorage: TokenStorage(prefs));

    final calledPaths = <String>[];
    Map<String, dynamic>? lastSubmitBody;
    apiClient.dio.httpClientAdapter = _TestAdapter((options) async {
      calledPaths.add(options.path);
      if (options.path == '/sessions/42/survey/confirm') {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': {'pointsAwarded': 35},
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      }
      lastSubmitBody = Map<String, dynamic>.from(options.data as Map);
      return ResponseBody.fromString(
        jsonEncode({
          'success': true,
          'data': {'totalPointsAwarded': 0},
        }),
        200,
        headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
      );
    });

    final ds = SurveyRemoteDataSourceImpl(apiClient: apiClient);

    // Case 1: User confirms AI output -> calls /sessions/42/survey/confirm and gets 35 pts
    final awarded = await ds.submitSurvey(
      '18',
      const [
        SurveyItemModel(
          itemId: '101',
          detectedWasteType: 'METAL',
          confirmedWasteType: 'METAL',
          points: 20,
          imageUrl: '',
        ),
        SurveyItemModel(
          itemId: '102',
          detectedWasteType: 'PLASTIC',
          confirmedWasteType: 'PLASTIC',
          points: 15,
          imageUrl: '',
        ),
      ],
      5,
      sessionId: '42',
    );
    expect(awarded, 35);
    expect(calledPaths.last, '/sessions/42/survey/confirm');

    // Case 2: User corrects an item -> calls /surveys/18/submit with integer itemId
    final correctionPoints = await ds.submitSurvey(
      '18',
      const [
        SurveyItemModel(
          itemId: '101',
          detectedWasteType: 'METAL',
          confirmedWasteType: 'Plastic',
          points: 20,
          imageUrl: '',
          isCorrected: true,
        ),
      ],
      3,
      sessionId: '42',
    );
    expect(correctionPoints, 0);
    expect(calledPaths.last, '/surveys/18/submit');
    expect((lastSubmitBody?['items'] as List).first['itemId'], 101);
    expect((lastSubmitBody?['items'] as List).first['confirmedWasteType'], 'PLASTIC');
  });

  testWidgets('VerifySurveyView shows real +0 PTS instead of hardcoded +21 PTS when empty', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final vm = VerifySurveyViewModel(surveyRepository: _EmptySurveyRepo());

    await tester.pumpWidget(
      ChangeNotifierProvider<VerifySurveyViewModel>.value(
        value: vm,
        child: const MaterialApp(
          home: VerifySurveyView(surveyId: '1', isReadOnly: true),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('+21 PTS'), findsNothing);
    expect(find.text('+0 PTS'), findsNWidgets(2));
    expect(find.text('No items were detected in this session.'), findsOneWidget);
  });
}
