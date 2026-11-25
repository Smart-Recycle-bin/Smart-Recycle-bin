import '../../domain/entities/ledger_entry_entity.dart';

class LedgerEntryModel extends LedgerEntryEntity {
  const LedgerEntryModel({
    required super.transactionId,
    required super.title,
    required super.timeFormatted,
    required super.pointsDelta,
    super.balanceAfter,
    required super.type,
    required super.source,
  });

  factory LedgerEntryModel.fromJson(Map<String, dynamic> json) {
    final points = (json['pointsDelta'] as num?)?.toInt() ??
        (json['points'] as num?)?.toInt() ??
        0;
    final rawType = json['type']?.toString() ?? json['entryType']?.toString();
    final isCredit = rawType != null
        ? rawType.toLowerCase() == 'credit'
        : points >= 0;

    return LedgerEntryModel(
      transactionId: (json['transactionId'] ?? '').toString(),
      title: json['title']?.toString() ??
          (isCredit ? 'Recycle Survey Bonus' : 'Gift Redeem'),
      timeFormatted: json['timeFormatted']?.toString() ??
          json['timestamp']?.toString() ??
          '',
      pointsDelta: points,
      balanceAfter: (json['balanceAfter'] as num?)?.toInt(),
      type: rawType ?? (isCredit ? 'credit' : 'debit'),
      source: json['source']?.toString() ?? 'session_confirm',
    );
  }
}
