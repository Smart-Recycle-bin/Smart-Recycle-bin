import '../../../../core/utils/result.dart';
import '../entities/catalog_item_entity.dart';
import '../entities/redeemed_voucher_entity.dart';

abstract class MarketplaceRepository {
  Future<Result<List<CatalogItemEntity>>> getCatalog();

  Future<Result<List<SpotlightBannerEntity>>> getSpotlightBanners();

  Future<Result<CatalogItemEntity>> getItemDetails(String itemId);

  Future<Result<String>> redeemReward({
    required String itemId,
    required int denominationEgp,
    required int pointsCost,
  });

  Future<Result<List<RedeemedVoucherEntity>>> getMyVouchers({String? status});
}
