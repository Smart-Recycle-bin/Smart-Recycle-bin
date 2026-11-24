import '../../../../core/utils/result.dart';
import '../entities/survey_entity.dart';
import '../entities/survey_item_entity.dart';

abstract class SurveyRepository {
  Future<Result<List<SurveyEntity>>> getSurveys({String status = 'all'});

  Future<Result<SurveyEntity>> getSurveyDetails(String surveyId);

  Future<Result<int>> submitSurvey({
    required String surveyId,
    required List<SurveyItemEntity> items,
    int? aiRating,
  });
}
