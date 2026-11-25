import 'package:dio/dio.dart';
import 'package:ecobin/core/config/app_config.dart';
import 'package:ecobin/core/constants/api_endpoints.dart';
import 'package:ecobin/core/mock/mock_data.dart';
import 'package:ecobin/core/network/api_client.dart';
import 'package:ecobin/core/network/dio_error_helper.dart';
import '../../domain/entities/catalog_item_entity.dart';
import '../models/catalog_item_model.dart';

abstract class MarketplaceRemoteDataSource {
  Future<List<CatalogItemModel>> getCatalog();
  Future<List<SpotlightBannerEntity>> getSpotlightBanners();
  Future<CatalogItemModel> getItemDetails(String itemId);
  Future<String> redeemReward(String itemId, int denominationEgp, int pointsCost);
}

class MarketplaceRemoteDataSourceImpl implements MarketplaceRemoteDataSource {
  final ApiClient apiClient;

  MarketplaceRemoteDataSourceImpl({required this.apiClient});

  @override
  Future<List<CatalogItemModel>> getCatalog() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getCatalog();
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.catalog);
      if (response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list.map((e) => CatalogItemModel.fromJson(e)).toList();
      }
      return MockData.getCatalog();
    } on DioException catch (_) {
      return MockData.getCatalog();
    }
  }

  @override
  Future<List<SpotlightBannerEntity>> getSpotlightBanners() async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getSpotlightBanners();
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.spotlightBanners);
      if (response.data['success'] == true) {
        final list = response.data['data'] as List;
        return list.map((e) {
          return SpotlightBannerEntity(
            bannerId: e['bannerId'] ?? 'b1',
            title: e['title'] ?? 'Metro Free Ticket On Your Next Trip',
            subtitle: e['subtitle'] ?? 'Enjoy a free Metro ride! Claim your free ticket on your next trip now.',
            imageUrl: e['imageUrl'] ?? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600',
            targetItemId: e['targetItemId'],
          );
        }).toList();
      }
      return MockData.getSpotlightBanners();
    } on DioException catch (_) {
      return MockData.getSpotlightBanners();
    }
  }

  @override
  Future<CatalogItemModel> getItemDetails(String itemId) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return MockData.getCatalog().firstWhere(
        (i) => i.itemId == itemId,
        orElse: () => MockData.getCatalog().first,
      );
    }

    try {
      final response = await apiClient.dio.get(ApiEndpoints.catalogItemDetails(itemId));
      if (response.data['success'] == true) {
        return CatalogItemModel.fromJson(response.data['data']);
      }
      return MockData.getCatalog().first;
    } on DioException catch (_) {
      return MockData.getCatalog().firstWhere(
        (i) => i.itemId == itemId,
        orElse: () => MockData.getCatalog().first,
      );
    }
  }

  @override
  Future<String> redeemReward(String itemId, int denominationEgp, int pointsCost) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return 'CRF-9F2C-1090'; // Voucher code from Screen 10
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.redeemReward(itemId),
        data: {'denominationEgp': denominationEgp},
      );
      if (response.data['success'] == true) {
        return response.data['data']['voucherCode'] as String;
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to redeem reward.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to redeem reward.'));
    }
  }
}
