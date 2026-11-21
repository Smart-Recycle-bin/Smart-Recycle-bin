import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';

abstract class ProfileRepository {
  Future<Result<UserEntity>> getProfile();
  Future<Result<UserEntity>> updateProfile({
    required String displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
  });
  Future<Result<bool>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  });
}
