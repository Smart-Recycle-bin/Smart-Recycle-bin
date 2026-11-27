class RedeemedVoucherEntity {
  final int voucherId;
  final int redemptionId;
  final String itemTitle;
  final int pointsSpent;
  final double valueEgpAtRedemption;
  final String voucherCode;
  final String? qrImageUrl;
  final DateTime redeemedAt;
  final String status;

  const RedeemedVoucherEntity({
    required this.voucherId,
    required this.redemptionId,
    required this.itemTitle,
    required this.pointsSpent,
    required this.valueEgpAtRedemption,
    required this.voucherCode,
    this.qrImageUrl,
    required this.redeemedAt,
    required this.status,
  });
}
