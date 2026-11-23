import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/features/auth/data/models/user_model.dart';

abstract class ProfileRemoteDataSource {
  Future<UserModel> getProfile();
  Future<UserModel> updateProfile(String displayName, String? phoneNumber, String? profilePhotoUrl);
  Future<bool> submitSupportTicket(String category, String description, String? sessionId);
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
      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      return MockData.currentUser;
    } on DioException catch (_) {
      return MockData.currentUser;
    }
  }

  @override
  Future<UserModel> updateProfile(
    String displayName,
    String? phoneNumber,
    String? profilePhotoUrl,
  ) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      MockData.currentUser = UserModel(
        userId: MockData.currentUser.userId,
        email: MockData.currentUser.email,
        displayName: displayName,
        role: MockData.currentUser.role,
        phoneNumber: phoneNumber ?? MockData.currentUser.phoneNumber,
        profilePhotoUrl: profilePhotoUrl ?? MockData.currentUser.profilePhotoUrl,
        points: MockData.currentUser.points,
      );
      return MockData.currentUser;
    }

    try {
      final response = await apiClient.dio.put(
        ApiEndpoints.profile,
        data: {
          'displayName': displayName,
          'phoneNumber': ?phoneNumber,
          'profilePhotoUrl': ?profilePhotoUrl,
        },
      );
      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      return MockData.currentUser;
    } on DioException catch (_) {
      return MockData.currentUser;
    }
  }

  @override
  Future<bool> submitSupportTicket(String category, String description, String? sessionId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return true;
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
      return response.data['success'] == true;
    } on DioException catch (_) {
      return true;
    }
  }
}
