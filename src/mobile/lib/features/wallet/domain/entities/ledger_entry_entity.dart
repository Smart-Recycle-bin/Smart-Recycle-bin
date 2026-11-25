class LedgerEntryEntity {
  final String transactionId;
  final String title;
  final String timeFormatted;
  final int pointsDelta;
  final int? balanceAfter;
  final String type; // 'credit' (earned) or 'debit' (spent)
  final String source;

  const LedgerEntryEntity({
    required this.transactionId,
    required this.title,
    required this.timeFormatted,
    required this.pointsDelta,
    this.balanceAfter,
    required this.type,
    required this.source,
  });

  bool get isCredit => type.toLowerCase() == 'credit' || pointsDelta > 0;

  String get pointsFormatted {
    if (pointsDelta > 0) return '+$pointsDelta PTS';
    return '$pointsDelta PTS';
  }
}
