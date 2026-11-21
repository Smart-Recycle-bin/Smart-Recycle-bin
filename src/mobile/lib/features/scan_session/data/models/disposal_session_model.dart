import '../../domain/entities/disposal_session_entity.dart';

class DetectedItemModel extends DetectedItemEntity {
  const DetectedItemModel({
    required super.itemId,
    required super.wasteType,
    required super.points,
    super.imageUrl,
  });

  factory DetectedItemModel.fromJson(Map<String, dynamic> json) {
    return DetectedItemModel(
      itemId: json['itemId'] ?? '',
      wasteType: json['wasteType'] ?? 'PLASTIC',
      points: json['estimatedPoints'] ?? json['points'] ?? 10,
      imageUrl: json['imageUrl'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'itemId': itemId,
      'wasteType': wasteType,
      'estimatedPoints': points,
      'imageUrl': imageUrl,
    };
  }
}

class DisposalSessionModel extends DisposalSessionEntity {
  const DisposalSessionModel({
    required super.sessionId,
    required super.binId,
    required super.binName,
    required super.status,
    required super.totalPoints,
    required super.countdownSeconds,
    required super.items,
  });

  factory DisposalSessionModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    final itemsList = rawItems.map((e) => DetectedItemModel.fromJson(e)).toList();

    int points = json['totalPoints'] ?? 0;
    if (points == 0 && itemsList.isNotEmpty) {
      points = itemsList.fold(0, (sum, item) => sum + item.points);
    }

    return DisposalSessionModel(
      sessionId: json['sessionId'] ?? '',
      binId: json['binId'] ?? 'bin-210',
      binName: json['binName'] ?? 'Bin#${json['binId']?.replaceAll('bin-', '') ?? '210'}',
      status: json['status'] ?? 'active',
      totalPoints: points,
      countdownSeconds: json['countdownSeconds'] ?? 90,
      items: itemsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'binId': binId,
      'binName': binName,
      'status': status,
      'totalPoints': totalPoints,
      'countdownSeconds': countdownSeconds,
      'items': items.map((e) => (e as DetectedItemModel).toJson()).toList(),
    };
  }
}
