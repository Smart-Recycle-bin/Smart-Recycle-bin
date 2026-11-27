import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/network/dio_error_helper.dart';
import '../models/survey_model.dart';
import '../models/survey_item_model.dart';

abstract class SurveyRemoteDataSource {
  Future<List<SurveyModel>> getSurveys(String status);
  Future<SurveyModel> getSurveyDetails(String surveyId);
  Future<int> submitSurvey(
    String surveyId,
    List<SurveyItemModel> items,
    int? aiRating, {
    String? sessionId,
  });
}

class SurveyRemoteDataSourceImpl implements SurveyRemoteDataSource {
  final ApiClient apiClient;

  SurveyRemoteDataSourceImpl({required this.apiClient});

  List<SurveyModel> _filterSurveys(String status) {
    final list = MockData.getSurveys();
    if (status.toLowerCase() == 'waiting') {
      return list.where((s) => s.status == 'waiting').toList();
    } else if (status.toLowerCase() == 'done') {
      return list.where((s) => s.status == 'done').toList();
    }
    return list;
  }

  @override
  Future<List<SurveyModel>> getSurveys(String status) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return _filterSurveys(status);
    }

    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.getSurveys,
        queryParameters: {'status': status},
      );
      if (response.data is Map && response.data['success'] == true) {
        final list = response.data['data']['surveys'] as List;
        return list
            .map((e) => SurveyModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception('Failed to load surveys');
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load surveys'));
    }
  }

  @override
  Future<SurveyModel> getSurveyDetails(String surveyId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getSurveys().firstWhere(
        (s) => s.surveyId == surveyId,
        orElse: () => MockData.getSurveys().first,
      );
    }

    try {
      final response = await apiClient.dio.get('/surveys/$surveyId');
      if (response.data is Map && response.data['success'] == true) {
        return SurveyModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      throw Exception('Failed to load survey details');
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load survey details'));
    }
  }

  @override
  Future<int> submitSurvey(
    String surveyId,
    List<SurveyItemModel> items,
    int? aiRating, {
    String? sessionId,
  }) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return 50; // Credited 50 points as on Screen 11
    }

    final hasCorrection = items.any(
      (i) =>
          i.isCorrected ||
          i.detectedWasteType.trim().toUpperCase() !=
              i.confirmedWasteType.trim().toUpperCase(),
    );

    try {
      if (!hasCorrection && sessionId != null && sessionId.isNotEmpty) {
        final response = await apiClient.dio.post('/sessions/$sessionId/survey/confirm');
        if (response.data is Map && response.data['success'] == true) {
          final data = response.data['data'] as Map?;
          return (data?['pointsAwarded'] as num?)?.toInt() ?? 0;
        }
        throw Exception('Failed to confirm survey');
      }

      final response = await apiClient.dio.post(
        ApiEndpoints.submitSurvey(surveyId),
        data: {
          'aiRating': aiRating ?? 5,
          'items': items
              .map((e) => {
                    'itemId': int.tryParse(e.itemId) ?? e.itemId,
                    'confirmedWasteType': e.confirmedWasteType.trim().toUpperCase(),
                  })
              .toList(),
        },
      );
      if (response.data is Map && response.data['success'] == true) {
        final data = response.data['data'] as Map?;
        return (data?['totalPointsAwarded'] as num?)?.toInt() ??
            (data?['pointsAwarded'] as num?)?.toInt() ??
            0;
      }
      throw Exception('Failed to submit survey corrections');
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to submit survey'));
    }
  }
}
