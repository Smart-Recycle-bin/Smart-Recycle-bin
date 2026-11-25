import 'survey_item_entity.dart';

class SurveyEntity {
  final String surveyId;
  final int surveyNumber;
  final String sessionId;
  final String binId;
  final String binName;
  final String status; // 'waiting', 'done'
  final int points;
  final String timeAgo;
  final List<SurveyItemEntity> items;

  const SurveyEntity({
    required this.surveyId,
    required this.surveyNumber,
    required this.sessionId,
    required this.binId,
    required this.binName,
    required this.status,
    required this.points,
    required this.timeAgo,
    this.items = const [],
  });

  bool get isWaiting => status.toLowerCase() == 'waiting';
}
