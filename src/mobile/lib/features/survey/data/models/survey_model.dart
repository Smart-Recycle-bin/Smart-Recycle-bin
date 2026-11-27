import '../../domain/entities/survey_entity.dart';
import 'survey_item_model.dart';

class SurveyModel extends SurveyEntity {
  const SurveyModel({
    required super.surveyId,
    required super.surveyNumber,
    required super.sessionId,
    required super.binId,
    required super.binName,
    required super.status,
    required super.points,
    required super.timeAgo,
    super.items,
  });

  factory SurveyModel.fromJson(Map<String, dynamic> json) {
    final rawItems = json['items'] as List? ?? [];
    final binIdStr = json['binId']?.toString() ?? '1';
    final surveyNum = (json['surveyNumber'] as num?)?.toInt() ??
        (json['surveyId'] as num?)?.toInt() ??
        2043;

    return SurveyModel(
      surveyId: json['surveyId']?.toString() ?? 'srv-$surveyNum',
      surveyNumber: surveyNum,
      sessionId: json['sessionId']?.toString() ?? '',
      binId: binIdStr,
      binName: json['binName']?.toString() ??
          'Bin#${binIdStr.replaceAll('bin-', '').padLeft(3, '0')}',
      status: json['status']?.toString() ?? 'waiting',
      points: (json['points'] as num?)?.toInt() ??
          (json['estimatedPoints'] as num?)?.toInt() ??
          (json['totalPoints'] as num?)?.toInt() ??
          0,
      timeAgo: json['timeAgo']?.toString() ?? 'Just now',
      items: rawItems
          .map((e) => SurveyItemModel.fromJson(Map<String, dynamic>.from(e as Map)))
          .toList(),
    );
  }
}
