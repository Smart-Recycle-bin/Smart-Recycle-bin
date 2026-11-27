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
    final detected = json['detectedWasteType']?.toString() ??
        json['wasteType']?.toString() ??
        'Plastic';
    final confirmed = json['confirmedWasteType']?.toString() ??
        json['wasteType']?.toString() ??
        detected;

    return SurveyItemModel(
      itemId: json['itemId']?.toString() ?? '',
      detectedWasteType: detected,
      confirmedWasteType: confirmed,
      points: (json['points'] as num?)?.toInt() ??
          (json['estimatedPoints'] as num?)?.toInt() ??
          5,
      imageUrl: json['imageUrl']?.toString() ??
          'https://images.unsplash.com/photo-1574974671999-24b7dfba0d53?w=300',
      isCorrected: json['isCorrected'] == true,
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
