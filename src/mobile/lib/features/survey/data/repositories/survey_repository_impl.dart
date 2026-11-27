import '../../../../core/utils/result.dart';
import '../../domain/entities/survey_entity.dart';
import '../../domain/entities/survey_item_entity.dart';
import '../../domain/repositories/survey_repository.dart';
import '../datasources/survey_remote_data_source.dart';
import '../models/survey_item_model.dart';

class SurveyRepositoryImpl implements SurveyRepository {
  final SurveyRemoteDataSource remoteDataSource;

  SurveyRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<List<SurveyEntity>>> getSurveys({String status = 'all'}) async {
    try {
      final surveys = await remoteDataSource.getSurveys(status);
      return Result.success(surveys);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<SurveyEntity>> getSurveyDetails(String surveyId) async {
    try {
      final survey = await remoteDataSource.getSurveyDetails(surveyId);
      return Result.success(survey);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<int>> submitSurvey({
    required String surveyId,
    String? sessionId,
    required List<SurveyItemEntity> items,
    int? aiRating,
  }) async {
    try {
      final models = items.map((e) {
        return SurveyItemModel(
          itemId: e.itemId,
          detectedWasteType: e.detectedWasteType,
          confirmedWasteType: e.confirmedWasteType,
          points: e.points,
          imageUrl: e.imageUrl,
          isCorrected: e.isCorrected,
        );
      }).toList();

      final points = await remoteDataSource.submitSurvey(
        surveyId,
        models,
        aiRating,
        sessionId: sessionId,
      );
      return Result.success(points);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
