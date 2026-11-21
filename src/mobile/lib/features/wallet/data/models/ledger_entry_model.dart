import '../../domain/entities/ledger_entry_entity.dart';

class LedgerEntryModel extends LedgerEntryEntity {
  const LedgerEntryModel({
    required super.transactionId,
    required super.title,
    required super.timeFormatted,
    required super.pointsDelta,
    required super.type,
    required super.source,
  });

  factory LedgerEntryModel.fromJson(Map<String, dynamic> json) {
    final points = json['pointsDelta'] ?? json['points'] ?? 10;
    final isCredit = (json['type'] ?? 'credit') == 'credit' || points > 0;
    return LedgerEntryModel(
      transactionId: json['transactionId'] ?? '',
      title: json['title'] ?? (isCredit ? 'Recycle Survey Bonus' : 'Gift Redeem'),
      timeFormatted: json['timeFormatted'] ?? json['timestamp'] ?? 'Today, 10:30 PM',
      pointsDelta: points,
      type: json['type'] ?? (points > 0 ? 'credit' : 'debit'),
      source: json['source'] ?? 'session_confirm',
    );
  }
}
