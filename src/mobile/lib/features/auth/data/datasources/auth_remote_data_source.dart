import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import '../models/user_model.dart';

abstract class AuthRemoteDataSource {
  Future<Map<String, dynamic>> login(String email, String password);
  Future<UserModel> register(String fullName, String email, String password);
  Future<bool> verifyEmail(String email, String otp);
  Future<bool> resendVerificationOtp(String email);
  Future<bool> sendPasswordResetOtp(String email);
  Future<bool> verifyResetOtp(String email, String otp);
  Future<void> logout();
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final ApiClient apiClient;

  AuthRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<Map<String, dynamic>> login(String email, String password) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return {
        'accessToken': 'mock_jwt_access_token_123',
        'refreshToken': 'mock_jwt_refresh_token_456',
        'user': MockData.currentUser.toJson(),
      };
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.login,
        data: {'email': email, 'password': password},
      );
      if (response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>;
      }
      throw Exception(response.data['error'] ?? 'Login failed');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message);
    }
  }

  @override
  Future<UserModel> register(String fullName, String email, String password) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return UserModel(
        userId: 'usr-new-${DateTime.now().millisecondsSinceEpoch}',
        email: email,
        displayName: fullName,
        role: 'USER_CITIZEN',
        points: 0,
      );
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.register,
        data: {
          'displayName': fullName,
          'email': email,
          'password': password,
        },
      );
      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      throw Exception(response.data['error'] ?? 'Registration failed');
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message);
    }
  }

  @override
  Future<bool> verifyEmail(String email, String otp) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return true;
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.verifyEmail,
        data: {'email': email, 'otp': otp},
      );
      return response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(e.response?.data?['message'] ?? e.message);
    }
  }

  @override
  Future<bool> resendVerificationOtp(String email) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return true;
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.resendVerificationOtp,
        data: {'email': email},
      );
      return response.data['success'] == true;
    } on DioException catch (_) {
      return true;
    }
  }

  @override
  Future<bool> sendPasswordResetOtp(String email) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return true;
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.forgotPassword,
        data: {'email': email},
      );
      return response.data['success'] == true;
    } on DioException catch (_) {
      return true;
    }
  }

  @override
  Future<bool> verifyResetOtp(String email, String otp) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return true;
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.verifyResetOtp,
        data: {'email': email, 'otp': otp},
      );
      return response.data['success'] == true;
    } on DioException catch (_) {
      return true;
    }
  }

  @override
  Future<void> logout() async {
    if (AppConfig.useMockData) {
      return;
    }

    try {
      await apiClient.dio.post(ApiEndpoints.logout);
    } catch (_) {}
  }
}
