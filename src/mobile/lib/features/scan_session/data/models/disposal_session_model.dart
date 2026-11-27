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
      itemId: json['itemId']?.toString() ?? '',
      wasteType: json['wasteType']?.toString() ?? 'PLASTIC',
      points: (json['estimatedPoints'] as num?)?.toInt() ??
          (json['points'] as num?)?.toInt() ??
          10,
      imageUrl: json['imageUrl']?.toString(),
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
    super.surveyId,
    required super.totalPoints,
    required super.countdownSeconds,
    required super.items,
  });

  factory DisposalSessionModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    final itemsList = rawItems
        .map((e) => DetectedItemModel.fromJson(Map<String, dynamic>.from(e as Map)))
        .toList();

    final parsedBinId = json['binId']?.toString() ?? '1';
    final parsedSurveyId = json['surveyId']?.toString();

    int points = (json['totalPoints'] as num?)?.toInt() ?? 0;
    if (points == 0 && itemsList.isNotEmpty) {
      points = itemsList.fold(0, (sum, item) => sum + item.points);
    }

    return DisposalSessionModel(
      sessionId: json['sessionId']?.toString() ?? '',
      binId: parsedBinId,
      binName: json['binName']?.toString() ??
          'Bin#${parsedBinId.replaceAll('bin-', '').padLeft(3, '0')}',
      status: json['status']?.toString() ?? 'active',
      surveyId: (parsedSurveyId != null && parsedSurveyId.isNotEmpty) ? parsedSurveyId : null,
      totalPoints: points,
      countdownSeconds: (json['countdownSeconds'] as num?)?.toInt() ?? 60,
      items: itemsList,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sessionId': sessionId,
      'binId': binId,
      'binName': binName,
      'status': status,
      if (surveyId != null) 'surveyId': surveyId,
      'totalPoints': totalPoints,
      'countdownSeconds': countdownSeconds,
      'items': items.map((e) => (e as DetectedItemModel).toJson()).toList(),
    };
  }
}
