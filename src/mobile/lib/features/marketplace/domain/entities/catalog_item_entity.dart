class VoucherDenomination {
  final String? itemId;
  final String? label;
  final int valueEgp;
  final int pointsCost;
  final bool inStock;

  const VoucherDenomination({
    this.itemId,
    this.label,
    required this.valueEgp,
    required this.pointsCost,
    this.inStock = true,
  });
}

class CatalogItemEntity {
  final String itemId;
  final String brand;
  final String title;
  final String description;
  final String logoUrl;
  final int defaultPointsCost;
  final List<VoucherDenomination> denominations;
  final bool inStock;

  const CatalogItemEntity({
    required this.itemId,
    required this.brand,
    required this.title,
    required this.description,
    required this.logoUrl,
    required this.defaultPointsCost,
    this.denominations = const [],
    this.inStock = true,
  });
}

class SpotlightBannerEntity {
  final String bannerId;
  final String title;
  final String subtitle;
  final String imageUrl;
  final String? targetItemId;

  const SpotlightBannerEntity({
    required this.bannerId,
    required this.title,
    required this.subtitle,
    required this.imageUrl,
    this.targetItemId,
  });
}
