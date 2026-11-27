import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/features/profile/presentation/views/profile_view.dart';
import 'package:ecobin/features/profile/presentation/views/edit_profile_view.dart';
import 'package:ecobin/features/profile/presentation/views/support_view.dart';
import 'package:ecobin/features/profile/presentation/widgets/editable_profile_avatar.dart';
import 'package:ecobin/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:ecobin/features/profile/domain/entities/support_ticket_entity.dart';
import 'package:ecobin/features/profile/domain/repositories/profile_repository.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'package:ecobin/features/auth/domain/repositories/auth_repository.dart';
import 'package:ecobin/core/utils/result.dart';

class MockProfileRepo implements ProfileRepository {
  String? currentPhotoUrl;
  List<int>? lastUploadedPhotoBytes;
  String? lastUploadedFileName;

  @override
  Future<Result<UserEntity>> getProfile() async {
    return Result.success(UserEntity(
      userId: 'u1',
      displayName: 'Youssef Mohamed',
      email: 'youssef@ecobin.eg',
      phoneNumber: '+20 100 123 4567',
      profilePhotoUrl: currentPhotoUrl,
      role: 'user',
      points: 1420,
    ));
  }

  @override
  Future<Result<UserEntity>> updateProfile({
    String? displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
    List<int>? photoBytes,
    String? photoFileName,
    bool removePhoto = false,
  }) async {
    if (removePhoto) {
      currentPhotoUrl = null;
    } else if (photoBytes != null) {
      lastUploadedPhotoBytes = photoBytes;
      lastUploadedFileName = photoFileName;
      currentPhotoUrl = 'https://cdn.example.com/profiles/u1.jpg?v=1';
    } else if (profilePhotoUrl != null) {
      currentPhotoUrl = profilePhotoUrl;
    }

    return Result.success(UserEntity(
      userId: 'u1',
      displayName: displayName ?? 'Youssef Mohamed',
      email: '',
      phoneNumber: phoneNumber ?? '+20 100 123 4567',
      profilePhotoUrl: currentPhotoUrl,
      role: 'USER_CITIZEN',
      points: 0,
    ));
  }

  final List<SupportTicketEntity> submitted = [];

  @override
  Future<Result<SupportTicketEntity>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  }) async {
    final ticket = SupportTicketEntity(
      ticketId: 'TICK-TEST0001',
      category: category,
      description: description,
      sessionId: sessionId,
      status: 'open',
      createdAt: DateTime.utc(2026, 11, 25, 16, 0),
    );
    submitted.add(ticket);
    return Result.success(ticket);
  }

  @override
  Future<Result<List<SupportTicketEntity>>> getSupportTickets() async {
    return Result.success(List.of(submitted));
  }
}

class MockAuthRepo implements AuthRepository {
  @override
  Future<Result<void>> logout() async => Result.success(null);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('ProfileView renders bottom navigation bar and profile details', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final pVm = ProfileViewModel(profileRepository: MockProfileRepo());
    final aVm = AuthViewModel(authRepository: MockAuthRepo());

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ProfileViewModel>.value(value: pVm),
          ChangeNotifierProvider<AuthViewModel>.value(value: aVm),
        ],
        child: const MaterialApp(
          home: ProfileView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify title, default person icon, and profile card
    expect(find.text('My profile'), findsOneWidget);
    expect(find.text('Youssef Mohamed'), findsOneWidget);
    expect(find.byIcon(Icons.person), findsOneWidget);

    // Verify Bottom Navigation Bar is present
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('Survey'), findsOneWidget);
    expect(find.text('Scan'), findsOneWidget);
    expect(find.text('Market'), findsOneWidget);
    expect(find.text('Wallet'), findsOneWidget);
  });

  testWidgets('SupportView submits ticket and displays created ticket card', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockProfileRepo();
    final pVm = ProfileViewModel(profileRepository: repo);

    await tester.pumpWidget(
      ChangeNotifierProvider<ProfileViewModel>.value(
        value: pVm,
        child: const MaterialApp(
          home: SupportView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.text('Bin Issue'));
    await tester.enterText(find.byType(TextField), 'Bin lid stuck');
    await tester.tap(find.text('Submit Ticket'));
    await tester.pumpAndSettle();

    expect(repo.submitted.length, 1);
    expect(repo.submitted.first.category, 'bin_issue');
    expect(repo.submitted.first.description, 'Bin lid stuck');
    expect(find.text('TICK-TEST0001'), findsOneWidget);
    expect(find.text('Bin lid stuck'), findsWidgets);
  });

  testWidgets('EditProfileView updates displayName and preserves email from GET profile', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final pVm = ProfileViewModel(profileRepository: MockProfileRepo());
    await pVm.fetchProfile();

    await tester.pumpWidget(
      ChangeNotifierProvider<ProfileViewModel>.value(
        value: pVm,
        child: const MaterialApp(
          home: EditProfileView(),
        ),
      ),
    );

    await tester.enterText(find.byType(TextField).first, 'Youssef Updated');
    await tester.tap(find.text('Save Changes'));
    await tester.pumpAndSettle();

    expect(pVm.user?.displayName, 'Youssef Updated');
    expect(pVm.user?.email, 'youssef@ecobin.eg');
  });

  testWidgets('Profile camera upload button opens picker sheet and uploads selected image', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockProfileRepo();
    final pVm = ProfileViewModel(profileRepository: repo);
    await pVm.fetchProfile();

    await tester.pumpWidget(
      ChangeNotifierProvider<ProfileViewModel>.value(
        value: pVm,
        child: MaterialApp(
          home: Scaffold(
            body: Center(
              child: EditableProfileAvatar(
                imageUrl: pVm.user?.profilePhotoUrl,
                onPickImage: (_) async => XFile.fromData(
                  Uint8List.fromList([0xFF, 0xD8, 0xFF, 0xE0]),
                  path: 'avatar.jpg',
                  name: 'avatar.jpg',
                ),
              ),
            ),
          ),
        ),
      ),
    );

    await tester.tap(find.byIcon(Icons.camera_alt));
    await tester.pumpAndSettle();

    expect(find.text('Profile Photo'), findsOneWidget);
    expect(find.text('Choose from Gallery'), findsOneWidget);
    expect(find.text('Take a Photo'), findsOneWidget);

    await tester.tap(find.text('Choose from Gallery'));
    await tester.pumpAndSettle();

    expect(repo.lastUploadedFileName, 'avatar.jpg');
    expect(repo.lastUploadedPhotoBytes, [0xFF, 0xD8, 0xFF, 0xE0]);
    expect(pVm.user?.profilePhotoUrl, 'https://cdn.example.com/profiles/u1.jpg?v=1');

    // Re-open options after photo is set and verify Remove Photo works
    await tester.tap(find.byIcon(Icons.camera_alt));
    await tester.pumpAndSettle();
    expect(find.text('Remove Photo'), findsOneWidget);

    await tester.tap(find.text('Remove Photo'));
    await tester.pumpAndSettle();
    expect(pVm.user?.profilePhotoUrl, isNull);
  });

  testWidgets('ProfileView camera icon opens bottom sheet when tapped', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final pVm = ProfileViewModel(profileRepository: MockProfileRepo());
    final aVm = AuthViewModel(authRepository: MockAuthRepo());

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<ProfileViewModel>.value(value: pVm),
          ChangeNotifierProvider<AuthViewModel>.value(value: aVm),
        ],
        child: const MaterialApp(
          home: ProfileView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    await tester.tap(find.byIcon(Icons.camera_alt));
    await tester.pumpAndSettle();

    expect(find.text('Profile Photo'), findsOneWidget);
    expect(find.text('Choose from Gallery'), findsOneWidget);
    expect(find.text('Take a Photo'), findsOneWidget);
  });
}
