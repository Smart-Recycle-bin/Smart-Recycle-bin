import '../../../../core/utils/result.dart';
import '../entities/user_entity.dart';

abstract class AuthRepository {
  Future<Result<UserEntity>> login({required String email, required String password});
  Future<Result<UserEntity>> register({
    required String fullName,
    required String email,
    required String password,
  });
  Future<Result<bool>> verifyEmail({required String email, required String otp});
  Future<Result<bool>> resendVerificationOtp({required String email});
  Future<Result<bool>> sendPasswordResetOtp({required String email});
  Future<Result<bool>> verifyResetOtp({required String email, required String otp});
  Future<Result<void>> logout();
  Future<UserEntity?> getCurrentUser();
}
