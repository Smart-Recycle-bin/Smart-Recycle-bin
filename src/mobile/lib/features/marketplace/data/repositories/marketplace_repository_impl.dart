import '../../../../core/utils/result.dart';
import '../../domain/entities/catalog_item_entity.dart';
import '../../domain/repositories/marketplace_repository.dart';
import '../datasources/marketplace_remote_data_source.dart';

class MarketplaceRepositoryImpl implements MarketplaceRepository {
  final MarketplaceRemoteDataSource remoteDataSource;

  MarketplaceRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<List<CatalogItemEntity>>> getCatalog() async {
    try {
      final catalog = await remoteDataSource.getCatalog();
      return Result.success(catalog);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<List<SpotlightBannerEntity>>> getSpotlightBanners() async {
    try {
      final banners = await remoteDataSource.getSpotlightBanners();
      return Result.success(banners);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<CatalogItemEntity>> getItemDetails(String itemId) async {
    try {
      final item = await remoteDataSource.getItemDetails(itemId);
      return Result.success(item);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<String>> redeemReward({
    required String itemId,
    required int denominationEgp,
    required int pointsCost,
  }) async {
    try {
      final code = await remoteDataSource.redeemReward(itemId, denominationEgp, pointsCost);
      return Result.success(code);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
