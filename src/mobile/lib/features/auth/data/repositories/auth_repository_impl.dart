import '../../../../core/storage/token_storage.dart';
import '../../../../core/utils/result.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final TokenStorage tokenStorage;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.tokenStorage,
  });

  @override
  Future<Result<UserEntity>> login({required String email, required String password}) async {
    try {
      final data = await remoteDataSource.login(email, password);
      final accessToken = data['accessToken'] as String? ?? 'demo_token';
      final refreshToken = data['refreshToken'] as String?;
      final userData = data['user'] as Map<String, dynamic>? ?? {};

      await tokenStorage.saveTokens(
        accessToken: accessToken,
        refreshToken: refreshToken,
      );

      final user = UserModel.fromJson(userData);
      await tokenStorage.saveUserData(user.toJson());

      return Result.success(user);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<UserEntity>> register({
    required String fullName,
    required String email,
    required String password,
  }) async {
    try {
      final user = await remoteDataSource.register(fullName, email, password);
      return Result.success(user);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<bool>> verifyEmail({required String email, required String otp}) async {
    try {
      final success = await remoteDataSource.verifyEmail(email, otp);
      return Result.success(success);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<bool>> resendVerificationOtp({required String email}) async {
    try {
      final success = await remoteDataSource.resendVerificationOtp(email);
      return Result.success(success);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<bool>> sendPasswordResetOtp({required String email}) async {
    try {
      final success = await remoteDataSource.sendPasswordResetOtp(email);
      return Result.success(success);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<bool>> verifyResetOtp({required String email, required String otp}) async {
    try {
      final success = await remoteDataSource.verifyResetOtp(email, otp);
      return Result.success(success);
    } catch (e) {
      return Result.failure(e.toString().replaceAll('Exception: ', ''));
    }
  }

  @override
  Future<Result<void>> logout() async {
    try {
      await remoteDataSource.logout();
      await tokenStorage.clear();
      return const Result.success(null);
    } catch (e) {
      await tokenStorage.clear();
      return const Result.success(null);
    }
  }

  @override
  Future<UserEntity?> getCurrentUser() async {
    final userData = tokenStorage.getUserData();
    if (userData != null) {
      return UserModel.fromJson(userData);
    }
    return null;
  }
}
