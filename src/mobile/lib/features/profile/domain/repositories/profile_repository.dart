import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import '../entities/support_ticket_entity.dart';

abstract class ProfileRepository {
  Future<Result<UserEntity>> getProfile();
  Future<Result<UserEntity>> updateProfile({
    String? displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
    List<int>? photoBytes,
    String? photoFileName,
    bool removePhoto = false,
  });
  Future<Result<SupportTicketEntity>> submitSupportTicket({
    required String category,
    required String description,
    String? sessionId,
  });
  Future<Result<List<SupportTicketEntity>>> getSupportTickets();
}
