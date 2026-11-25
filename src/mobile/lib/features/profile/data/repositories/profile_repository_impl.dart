import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/profile/domain/entities/support_ticket_entity.dart';
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
    String? displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
    List<int>? photoBytes,
    String? photoFileName,
    bool removePhoto = false,
  }) async {
    try {
      final user = await remoteDataSource.updateProfile(
        displayName,
        phoneNumber,
        profilePhotoUrl,
        photoBytes: photoBytes,
        photoFileName: photoFileName,
        removePhoto: removePhoto,
      );
      return Result.success(user);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<SupportTicketEntity>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  }) async {
    try {
      final ticket = await remoteDataSource.submitSupportTicket(category, description, sessionId);
      return Result.success(ticket);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<List<SupportTicketEntity>>> getSupportTickets() async {
    try {
      final tickets = await remoteDataSource.getSupportTickets();
      return Result.success(tickets);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
