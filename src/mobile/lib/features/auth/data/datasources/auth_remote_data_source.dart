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

  String _extractErrorMessage(dynamic data, String fallback) {
    if (data is Map<String, dynamic>) {
      final errorObj = data['error'];
      if (errorObj is Map<String, dynamic>) {
        final msg = errorObj['message'];
        if (msg != null && msg.toString().isNotEmpty) {
          return msg.toString();
        }
      } else if (errorObj is String && errorObj.isNotEmpty) {
        return errorObj;
      } else if (data['message'] != null) {
        return data['message'].toString();
      }
    }
    return fallback;
  }

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
        data: {'email': email.trim(), 'password': password},
      );
      if (response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>;
      }
      throw Exception(_extractErrorMessage(response.data, 'Login failed'));
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Login failed'));
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
          'displayName': fullName.trim(),
          'email': email.trim(),
          'password': password,
        },
      );
      if (response.data['success'] == true) {
        return UserModel.fromJson(response.data['data']);
      }
      throw Exception(_extractErrorMessage(response.data, 'Registration failed'));
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Registration failed'));
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
        data: {'email': email.trim(), 'otp': otp.trim()},
      );
      if (response.data['success'] == true) {
        return true;
      }
      throw Exception(_extractErrorMessage(response.data, 'Verification failed'));
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Verification failed'));
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
        data: {'email': email.trim()},
      );
      return response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Failed to resend code'));
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
        data: {'email': email.trim()},
      );
      return response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Failed to send reset code'));
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
        data: {'email': email.trim(), 'otp': otp.trim()},
      );
      return response.data['success'] == true;
    } on DioException catch (e) {
      throw Exception(_extractErrorMessage(e.response?.data, e.message ?? 'Invalid code'));
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
