import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import '../models/survey_model.dart';
import '../models/survey_item_model.dart';

abstract class SurveyRemoteDataSource {
  Future<List<SurveyModel>> getSurveys(String status);
  Future<SurveyModel> getSurveyDetails(String surveyId);
  Future<int> submitSurvey(String surveyId, List<SurveyItemModel> items, int? aiRating);
}

class SurveyRemoteDataSourceImpl implements SurveyRemoteDataSource {
  final ApiClient apiClient;

  SurveyRemoteDataSourceImpl({required this.apiClient});

  List<SurveyModel> _filterSurveys(String status) {
    final list = MockData.getSurveys();
    if (status.toLowerCase() == 'waiting') {
      return list.where((s) => s.status == 'waiting').toList();
    } else if (status.toLowerCase() == 'done') {
      return list.where((s) => s.status == 'done').toList();
    }
    return list;
  }

  @override
  Future<List<SurveyModel>> getSurveys(String status) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return _filterSurveys(status);
    }

    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.getSurveys,
        queryParameters: {'status': status},
      );
      if (response.data['success'] == true) {
        final list = response.data['data']['surveys'] as List;
        return list.map((e) => SurveyModel.fromJson(e)).toList();
      }
      return _filterSurveys(status);
    } on DioException catch (_) {
      return _filterSurveys(status);
    }
  }

  @override
  Future<SurveyModel> getSurveyDetails(String surveyId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getSurveys().firstWhere(
        (s) => s.surveyId == surveyId,
        orElse: () => MockData.getSurveys().first,
      );
    }

    try {
      final response = await apiClient.dio.get('/surveys/$surveyId');
      if (response.data['success'] == true) {
        return SurveyModel.fromJson(response.data['data']);
      }
      return MockData.getSurveys().first;
    } on DioException catch (_) {
      return MockData.getSurveys().firstWhere(
        (s) => s.surveyId == surveyId,
        orElse: () => MockData.getSurveys().first,
      );
    }
  }

  @override
  Future<int> submitSurvey(String surveyId, List<SurveyItemModel> items, int? aiRating) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return 50; // Credited 50 points as on Screen 11
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.submitSurvey(surveyId),
        data: {
          'aiRating': aiRating ?? 5,
          'items': items.map((e) => e.toJson()).toList(),
        },
      );
      if (response.data['success'] == true) {
        return response.data['data']['totalPointsAwarded'] ?? 50;
      }
      return 50;
    } on DioException catch (_) {
      return 50;
    }
  }
}
