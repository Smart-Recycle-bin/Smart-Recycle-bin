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
      if (response.data['success'] == true && response.data['data'] is List) {
        final list = response.data['data'] as List;
        return list
            .map((e) => CatalogItemModel.fromJson(Map<String, dynamic>.from(e as Map)))
            .toList();
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load catalog items.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load catalog items.'));
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
      if (response.data['success'] == true && response.data['data'] is List) {
        final list = response.data['data'] as List;
        return list.map((e) {
          final m = Map<String, dynamic>.from(e as Map);
          return SpotlightBannerEntity(
            bannerId: m['bannerId']?.toString() ?? 'b1',
            title: m['title']?.toString() ?? 'Metro Free Ticket On Your Next Trip',
            subtitle: m['subtitle']?.toString() ??
                'Enjoy a free Metro ride! Claim your free ticket on your next trip now.',
            imageUrl: m['imageUrl']?.toString() ??
                'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600',
            targetItemId: m['targetItemId']?.toString(),
          );
        }).toList();
      }
      return [];
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load spotlight banners.'));
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
      if (response.data['success'] == true && response.data['data'] is Map) {
        return CatalogItemModel.fromJson(
          Map<String, dynamic>.from(response.data['data'] as Map),
        );
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to load reward details.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to load reward details.'));
    }
  }

  @override
  Future<String> redeemReward(String itemId, int denominationEgp, int pointsCost) async {
    if (AppConfig.useMockData) {
      await Future.delayed(const Duration(milliseconds: AppConfig.mockLatencyMs));
      return 'CRF-9F2C-1090';
    }

    try {
      final response = await apiClient.dio.post(
        ApiEndpoints.redeemReward(itemId),
        data: const <String, dynamic>{},
      );
      if (response.data['success'] == true && response.data['data'] is Map) {
        final code = response.data['data']['voucherCode']?.toString();
        if (code != null && code.isNotEmpty) return code;
      }
      throw Exception(
        response.data['error']?['message'] ?? 'Failed to redeem reward.',
      );
    } on DioException catch (e) {
      throw Exception(extractDioErrorMessage(e, 'Failed to redeem reward.'));
    }
  }
}
