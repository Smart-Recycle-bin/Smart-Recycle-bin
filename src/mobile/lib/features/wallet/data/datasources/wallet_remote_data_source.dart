import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/network/dio_error_helper.dart';
import '../models/ledger_entry_model.dart';

abstract class WalletRemoteDataSource {
  Future<Map<String, dynamic>> getWalletBalance();
  Future<List<LedgerEntryModel>> getLedger();
}

class WalletRemoteDataSourceImpl implements WalletRemoteDataSource {
  final ApiClient apiClient;

  WalletRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<Map<String, dynamic>> getWalletBalance() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return {
        'availablePoints': 1420,
        'lifetimeEarnedPoints': 3120,
      };
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.walletBalance);
      if (response.data['success'] == true) {
        return response.data['data'] as Map<String, dynamic>;
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load wallet balance.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load wallet balance.'));
    }
  }

  @override
  Future<List<LedgerEntryModel>> getLedger() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getLedger();
    }

    try {
      final response = await apiClient.dio.get(
        ApiEndpoints.walletLedger,
        queryParameters: const {'page': 1, 'pageSize': 50},
      );
      if (response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list
            .map((e) => LedgerEntryModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load wallet ledger.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load wallet ledger.'));
    }
  }
}
