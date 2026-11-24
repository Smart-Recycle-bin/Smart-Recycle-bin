class SurveyItemEntity {
  final String itemId;
  final String detectedWasteType;
  final String confirmedWasteType;
  final int points;
  final String imageUrl;
  final bool isCorrected;

  const SurveyItemEntity({
    required this.itemId,
    required this.detectedWasteType,
    required this.confirmedWasteType,
    required this.points,
    required this.imageUrl,
    this.isCorrected = false,
  });

  SurveyItemEntity copyWith({
    String? confirmedWasteType,
    bool? isCorrected,
  }) {
    return SurveyItemEntity(
      itemId: itemId,
      detectedWasteType: detectedWasteType,
      confirmedWasteType: confirmedWasteType ?? this.confirmedWasteType,
      points: points,
      imageUrl: imageUrl,
      isCorrected: isCorrected ?? this.isCorrected,
    );
  }
}
