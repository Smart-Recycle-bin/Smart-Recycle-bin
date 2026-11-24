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
    return SurveyModel(
      surveyId: json['surveyId'] ?? 'srv-${json['surveyNumber'] ?? 2043}',
      surveyNumber: json['surveyNumber'] ?? 2043,
      sessionId: json['sessionId'] ?? 's-9021',
      binId: json['binId'] ?? 'bin-420',
      binName: json['binName'] ?? 'Bin#${json['binId']?.replaceAll('bin-', '') ?? '420'}',
      status: json['status'] ?? 'waiting',
      points: json['points'] ?? json['estimatedPoints'] ?? 21,
      timeAgo: json['timeAgo'] ?? 'Today, 10:30 PM',
      items: rawItems.map((e) => SurveyItemModel.fromJson(e)).toList(),
    );
  }
}
