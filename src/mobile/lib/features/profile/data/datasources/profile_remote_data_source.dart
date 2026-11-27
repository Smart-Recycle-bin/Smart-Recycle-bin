import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/network/dio_error_helper.dart';
import 'package:ecobin/features/auth/data/models/user_model.dart';
import '../models/support_ticket_model.dart';

abstract class ProfileRemoteDataSource {
  Future<UserModel> getProfile();
  Future<UserModel> updateProfile(
    String? displayName,
    String? phoneNumber,
    String? profilePhotoUrl, {
    List<int>? photoBytes,
    String? photoFileName,
    bool removePhoto = false,
  });
  Future<SupportTicketModel> submitSupportTicket(String category, String description, String? sessionId);
  Future<List<SupportTicketModel>> getSupportTickets();
}

class ProfileRemoteDataSourceImpl implements ProfileRemoteDataSource {
  final ApiClient apiClient;

  ProfileRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<UserModel> getProfile() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.currentUser;
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.profile);
      if (response.data['success'] == true && response.data['data'] is Map) {
        return UserModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load profile.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load profile.'));
    }
  }

  @override
  Future<UserModel> updateProfile(
    String? displayName,
    String? phoneNumber,
    String? profilePhotoUrl, {
    List<int>? photoBytes,
    String? photoFileName,
    bool removePhoto = false,
  }) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      MockData.currentUser = UserModel(
        userId: MockData.currentUser.userId,
        email: MockData.currentUser.email,
        displayName: (displayName != null && displayName.trim().isNotEmpty)
            ? displayName.trim()
            : MockData.currentUser.displayName,
        role: MockData.currentUser.role,
        phoneNumber: phoneNumber ?? MockData.currentUser.phoneNumber,
        profilePhotoUrl: removePhoto ? null : (profilePhotoUrl ?? MockData.currentUser.profilePhotoUrl),
        points: MockData.currentUser.points,
      );
      return MockData.currentUser;
    }

    try {
      final safeName = (photoFileName != null && photoFileName.trim().isNotEmpty)
          ? photoFileName.trim()
          : 'avatar.jpg';

      final formMap = <String, dynamic>{
        if (displayName != null && displayName.trim().isNotEmpty)
          'displayName': displayName.trim(),
        if (phoneNumber != null && phoneNumber.trim().isNotEmpty)
          'phoneNumber': phoneNumber.trim(),
      };
      if (removePhoto) {
        formMap['removePhoto'] = true;
      } else if (photoBytes != null) {
        formMap['photo'] = MultipartFile.fromBytes(
          photoBytes,
          filename: safeName,
        );
      } else if (profilePhotoUrl != null) {
        formMap['profilePhotoUrl'] = profilePhotoUrl;
      }
      final formData = FormData.fromMap(formMap);

      final response = await apiClient.dio.put(
        ApiEndpoints.profile,
        data: formData,
        options: Options(contentType: 'multipart/form-data'),
      );
      if (response.data['success'] == true && response.data['data'] is Map) {
        return UserModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to update profile.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to update profile.'));
    }
  }

  @override
  Future<SupportTicketModel> submitSupportTicket(String category, String description, String? sessionId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return SupportTicketModel(
        ticketId: 'TICK-MOCK0001',
        category: category,
        description: description,
        sessionId: sessionId,
        status: 'open',
        createdAt: DateTime.now().toUtc(),
      );
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.submitSupportTicket,
        data: {
          'category': category,
          'description': description,
          'sessionId': ?sessionId,
        },
      );
      if (response.data['success'] == true && response.data['data'] is Map) {
        return SupportTicketModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to submit support ticket.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to submit support ticket.'));
    }
  }

  @override
  Future<List<SupportTicketModel>> getSupportTickets() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return [];
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.submitSupportTicket);
      if (response.data['success'] == true && response.data['data'] is List) {
        final list = response.data['data'] as List;
        return list
            .map((e) => SupportTicketModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load support tickets.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load support tickets.'));
    }
  }
}
