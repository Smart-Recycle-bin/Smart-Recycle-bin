import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/features/profile/presentation/views/profile_view.dart';
import 'package:ecobin/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:ecobin/features/profile/domain/repositories/profile_repository.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'package:ecobin/features/auth/domain/repositories/auth_repository.dart';
import 'package:ecobin/core/utils/result.dart';

class MockProfileRepo implements ProfileRepository {
  @override
  Future<Result<UserEntity>> getProfile() async {
    return Result.success(const UserEntity(
      userId: 'u1',
      displayName: 'Youssef Mohamed',
      email: 'youssef@ecobin.eg',
      phoneNumber: '+20 100 123 4567',
      role: 'user',
      points: 1420,
    ));
  }

  @override
  Future<Result<UserEntity>> updateProfile({
    required String displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<bool>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  }) async {
    return Result.success(true);
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

    // Verify title and profile card
    expect(find.text('My profile'), findsOneWidget);
    expect(find.text('Youssef Mohamed'), findsOneWidget);

    // Verify Bottom Navigation Bar is present
    expect(find.text('Map'), findsOneWidget);
    expect(find.text('Survey'), findsOneWidget);
    expect(find.text('Scan'), findsOneWidget);
    expect(find.text('Market'), findsOneWidget);
    expect(find.text('Wallet'), findsOneWidget);
  });
}
