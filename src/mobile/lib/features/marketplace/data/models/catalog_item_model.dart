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
    final itemIdStr = json['itemId']?.toString() ?? '';
    final titleStr = json['title']?.toString() ?? 'Reward Voucher';
    final defaultPoints =
        (json['pointsCost'] as num?)?.toInt() ??
        (json['startingPointsCost'] as num?)?.toInt() ??
        (json['defaultPointsCost'] as num?)?.toInt() ??
        1000;

    final isAvailable =
        json['inStock'] == true ||
        json['status'] == 'in_stock' ||
        ((json['stock'] as num?)?.toInt() ?? 1) > 0;

    final rawOptions = json['options'] as List?;
    final rawDenoms = json['denominations'] as List?;

    late final List<VoucherDenomination> parsedDenoms;
    if (rawOptions != null && rawOptions.isNotEmpty) {
      parsedDenoms = rawOptions.whereType<Map>().map((o) {
        final optPoints = (o['pointsCost'] as num?)?.toInt() ?? defaultPoints;
        return VoucherDenomination(
          itemId: o['itemId']?.toString() ?? itemIdStr,
          label: o['title']?.toString(),
          valueEgp: optPoints >= 100 ? optPoints ~/ 100 : (optPoints > 0 ? optPoints : 10),
          pointsCost: optPoints,
          inStock: o['inStock'] != false,
        );
      }).toList();
    } else if (rawDenoms != null && rawDenoms.isNotEmpty) {
      parsedDenoms = rawDenoms.whereType<Map>().map((d) {
        return VoucherDenomination(
          itemId: itemIdStr,
          valueEgp: (d['valueEgp'] as num?)?.toInt() ?? 10,
          pointsCost: (d['pointsCost'] as num?)?.toInt() ?? defaultPoints,
        );
      }).toList();
    } else {
      parsedDenoms = [
        VoucherDenomination(
          itemId: itemIdStr,
          label: titleStr,
          valueEgp: defaultPoints >= 100 ? defaultPoints ~/ 100 : (defaultPoints > 0 ? defaultPoints : 10),
          pointsCost: defaultPoints,
          inStock: isAvailable,
        ),
      ];
    }

    return CatalogItemModel(
      itemId: itemIdStr,
      brand: json['brand']?.toString() ?? 'Merchant',
      title: titleStr,
      description: json['description']?.toString() ?? 'Digital reward voucher redeemable with points.',
      logoUrl: json['logoUrl']?.toString() ?? '',
      defaultPointsCost: defaultPoints,
      denominations: parsedDenoms,
      inStock: isAvailable,
    );
  }
}
