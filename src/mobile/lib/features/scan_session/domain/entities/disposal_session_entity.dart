class DetectedItemEntity {
  final String itemId;
  final String wasteType; // PLASTIC, METAL, PAPER, ORGANIC, TRASH
  final int points;
  final String? imageUrl;

  const DetectedItemEntity({
    required this.itemId,
    required this.wasteType,
    required this.points,
    this.imageUrl,
  });

  String get displayName {
    switch (wasteType.toUpperCase()) {
      case 'PLASTIC_BOTTLE':
      case 'PLASTIC':
        return 'Plastic';
      case 'ALUMINUM_CAN':
      case 'METAL':
        return 'Metal';
      case 'PAPER':
        return 'Paper';
      case 'ORGANIC':
        return 'Organic';
      case 'TRASH':
      default:
        return 'Trash';
    }
  }
}

class DisposalSessionEntity {
  final String sessionId;
  final String binId;
  final String binName;
  final String status; // active, ended, terminated
  final int totalPoints;
  final int countdownSeconds;
  final List<DetectedItemEntity> items;

  const DisposalSessionEntity({
    required this.sessionId,
    required this.binId,
    required this.binName,
    required this.status,
    required this.totalPoints,
    required this.countdownSeconds,
    required this.items,
  });

  bool get isActive => status.toLowerCase() == 'active';
  int get itemsCount => items.length;
}
