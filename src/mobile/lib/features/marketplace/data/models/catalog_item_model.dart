import '../../domain/entities/catalog_item_entity.dart';

class CatalogItemModel extends CatalogItemEntity {
  const CatalogItemModel({
    required super.itemId,
    required super.brand,
    required super.title,
    required super.description,
    required super.logoUrl,
    required super.defaultPointsCost,
    super.denominations,
    super.inStock,
  });

  factory CatalogItemModel.fromJson(Map<String, dynamic> json) {
    final rawDenoms = json['denominations'] as List? ?? [];
    final denoms = rawDenoms.map((d) {
      return VoucherDenomination(
        valueEgp: d['valueEgp'] ?? 10,
        pointsCost: d['pointsCost'] ?? 1000,
      );
    }).toList();

    return CatalogItemModel(
      itemId: json['itemId'] ?? '',
      brand: json['brand'] ?? 'Merchant',
      title: json['title'] ?? 'Reward Voucher',
      description: json['description'] ?? 'Digital reward voucher redeemable with points.',
      logoUrl: json['logoUrl'] ?? '',
      defaultPointsCost: json['pointsCost'] ?? json['defaultPointsCost'] ?? 1000,
      denominations: denoms.isNotEmpty
          ? denoms
          : const [
              VoucherDenomination(valueEgp: 10, pointsCost: 1000),
              VoucherDenomination(valueEgp: 20, pointsCost: 2000),
              VoucherDenomination(valueEgp: 30, pointsCost: 3000),
            ],
      inStock: json['status'] == 'in_stock' || (json['stock'] ?? 1) > 0,
    );
  }
}
