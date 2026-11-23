import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import '../models/disposal_session_model.dart';

abstract class SessionRemoteDataSource {
  Future<DisposalSessionModel> startSession(String binId, String qrPayload);
  Future<DisposalSessionModel> getSessionStatus(String sessionId);
  Future<DisposalSessionModel> endSession(String sessionId);
}

class SessionRemoteDataSourceImpl implements SessionRemoteDataSource {
  final ApiClient apiClient;

  SessionRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<DisposalSessionModel> startSession(String binId, String qrPayload) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getActiveSession(binId);
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.startSession(binId),
        data: {'qrPayload': qrPayload},
      );
      if (response.data['success'] == true) {
        return DisposalSessionModel.fromJson(response.data['data']);
      }
      return MockData.getActiveSession(binId);
    } on DioException catch (_) {
      return MockData.getActiveSession(binId);
    }
  }

  @override
  Future<DisposalSessionModel> getSessionStatus(String sessionId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getActiveSession('bin-210');
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.getSession(sessionId));
      if (response.data['success'] == true) {
        return DisposalSessionModel.fromJson(response.data['data']);
      }
      return MockData.getActiveSession('bin-210');
    } on DioException catch (_) {
      return MockData.getActiveSession('bin-210');
    }
  }

  @override
  Future<DisposalSessionModel> endSession(String sessionId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getActiveSession('bin-210');
    }

    try {
      final response = await apiClient.dio.post(ApiEndpoints.endSession(sessionId));
      if (response.data['success'] == true) {
        return DisposalSessionModel.fromJson(response.data['data']);
      }
      return MockData.getActiveSession('bin-210');
    } on DioException catch (_) {
      return MockData.getActiveSession('bin-210');
    }
  }
}
