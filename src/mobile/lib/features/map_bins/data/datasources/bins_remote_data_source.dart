import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/network/dio_error_helper.dart';
import '../models/bin_model.dart';

abstract class BinsRemoteDataSource {
  Future<List<BinModel>> getNearbyBins(double lat, double lng, double radiusKm);
  Future<List<BinModel>> searchBins(String query, double? lat, double? lng);
  Future<BinModel> getBinDetails(String binId);
}

class BinsRemoteDataSourceImpl implements BinsRemoteDataSource {
  final ApiClient apiClient;

  BinsRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<BinModel>> getNearbyBins(double lat, double lng, double radiusKm) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getBins(centerLat: lat, centerLng: lng);
    }

    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.getBins,
        queryParameters: {'lat': lat, 'lng': lng, 'radiusKm': radiusKm},
      );
      if (response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list
            .map((e) => BinModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load nearby bins.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load nearby bins.'));
    }
  }

  @override
  Future<List<BinModel>> searchBins(String query, double? lat, double? lng) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      final all = MockData.getBins();
      if (query.trim().isEmpty) return all;
      return all.where((b) =>
          b.name.toLowerCase().contains(query.toLowerCase()) ||
          b.district.toLowerCase().contains(query.toLowerCase())).toList();
    }

    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.searchBins,
        queryParameters: {'query': query, 'lat': lat, 'lng': lng},
      );
      if (response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list
            .map((e) => BinModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to search bins.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to search bins.'));
    }
  }

  @override
  Future<BinModel> getBinDetails(String binId) async {
    // Note: E61 (Bin Details) is reserved for admin dashboard;
    // mobile relies on the loaded list of nearby bins.
    final all = MockData.getBins();
    return all.firstWhere(
      (b) => b.binId == binId,
      orElse: () => all.first,
    );
  }
}
