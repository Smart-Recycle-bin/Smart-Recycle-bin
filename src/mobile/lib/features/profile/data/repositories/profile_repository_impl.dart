import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/profile/domain/repositories/profile_repository.dart';
import '../datasources/profile_remote_data_source.dart';

class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource remoteDataSource;

  ProfileRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<UserEntity>> getProfile() async {
    try {
      final user = await remoteDataSource.getProfile();
      return Result.success(user);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<UserEntity>> updateProfile({
    required String displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
  }) async {
    try {
      final user = await remoteDataSource.updateProfile(displayName, phoneNumber, profilePhotoUrl);
      return Result.success(user);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<bool>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  }) async {
    try {
      final success = await remoteDataSource.submitSupportTicket(category, description, sessionId);
      return Result.success(success);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
