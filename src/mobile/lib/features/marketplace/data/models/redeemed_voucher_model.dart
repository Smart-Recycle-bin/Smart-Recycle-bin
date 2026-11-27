import '../../domain/entities/redeemed_voucher_entity.dart';

class RedeemedVoucherModel extends RedeemedVoucherEntity {
  const RedeemedVoucherModel({
    required super.voucherId,
    required super.redemptionId,
    required super.itemTitle,
    required super.pointsSpent,
    required super.valueEgpAtRedemption,
    required super.voucherCode,
    super.qrImageUrl,
    required super.redeemedAt,
    required super.status,
  });

  factory RedeemedVoucherModel.fromJson(Map<String, dynamic> json) {
    return RedeemedVoucherModel(
      voucherId: (json['voucherId'] as num?)?.toInt() ?? 0,
      redemptionId: (json['redemptionId'] as num?)?.toInt() ?? 0,
      itemTitle: json['itemTitle']?.toString() ?? 'Reward Voucher',
      pointsSpent: (json['pointsSpent'] as num?)?.toInt() ?? 0,
      valueEgpAtRedemption: (json['valueEgpAtRedemption'] as num?)?.toDouble() ?? 0.0,
      voucherCode: json['voucherCode']?.toString() ?? '',
      qrImageUrl: json['qrImageUrl']?.toString(),
      redeemedAt: DateTime.tryParse(json['redeemedAt']?.toString() ?? '') ??
          DateTime.now().toUtc(),
      status: (json['status']?.toString() ?? 'unused').toLowerCase(),
    );
  }
}
