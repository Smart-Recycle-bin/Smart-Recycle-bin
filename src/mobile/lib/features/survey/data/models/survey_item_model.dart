import '../../domain/entities/survey_item_entity.dart';

class SurveyItemModel extends SurveyItemEntity {
  const SurveyItemModel({
    required super.itemId,
    required super.detectedWasteType,
    required super.confirmedWasteType,
    required super.points,
    required super.imageUrl,
    super.isCorrected,
  });

  factory SurveyItemModel.fromJson(Map<String, dynamic> json) {
    return SurveyItemModel(
      itemId: json['itemId'] ?? '',
      detectedWasteType: json['detectedWasteType'] ?? json['wasteType'] ?? 'Plastic',
      confirmedWasteType: json['confirmedWasteType'] ?? json['wasteType'] ?? 'Plastic',
      points: json['points'] ?? json['estimatedPoints'] ?? 5,
      imageUrl: json['imageUrl'] ??
          'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
      isCorrected: json['isCorrected'] ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'itemId': itemId,
      'detectedWasteType': detectedWasteType,
      'confirmedWasteType': confirmedWasteType,
      'points': points,
      'imageUrl': imageUrl,
      'isCorrected': isCorrected,
    };
  }
}
