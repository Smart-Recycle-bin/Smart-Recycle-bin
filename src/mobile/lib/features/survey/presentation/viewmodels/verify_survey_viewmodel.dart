import 'package:flutter/foundation.dart';
import '../../domain/entities/survey_entity.dart';
import '../../domain/entities/survey_item_entity.dart';
import '../../domain/repositories/survey_repository.dart';

class VerifySurveyViewModel extends ChangeNotifier {
  final SurveyRepository surveyRepository;

  VerifySurveyViewModel({required this.surveyRepository});

  SurveyEntity? _survey;
  List<SurveyItemEntity> _items = [];
  int _aiRating = 4;
  int _totalRewardPoints = 50;
  bool _isLoading = false;
  String? _errorMessage;

  SurveyEntity? get survey => _survey;
  List<SurveyItemEntity> get items => _items;
  int get aiRating => _aiRating;
  int get totalRewardPoints => _totalRewardPoints;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> loadSurvey(String surveyId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await surveyRepository.getSurveyDetails(surveyId);
    _isLoading = false;

    result.when(
      onSuccess: (surveyData) {
        _survey = surveyData;
        _items = List.from(surveyData.items);
      },
      onFailure: (error) {
        _errorMessage = error;
      },
    );
    notifyListeners();
  }

  void updateItemCategory(int index, String newCategory) {
    if (index >= 0 && index < _items.length) {
      final current = _items[index];
      final isCorrected = current.detectedWasteType.toLowerCase() != newCategory.toLowerCase();
      _items[index] = current.copyWith(
        confirmedWasteType: newCategory,
        isCorrected: isCorrected,
      );
      notifyListeners();
    }
  }

  void setAiRating(int rating) {
    _aiRating = rating;
    notifyListeners();
  }

  Future<bool> submitSurvey() async {
    if (_survey == null) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await surveyRepository.submitSurvey(
      surveyId: _survey!.surveyId,
      items: _items,
      aiRating: _aiRating,
    );

    _isLoading = false;
    return result.when(
      onSuccess: (pointsAwarded) {
        _totalRewardPoints = pointsAwarded;
        notifyListeners();
        return true;
      },
      onFailure: (error) {
        _errorMessage = error;
        notifyListeners();
        return false;
      },
    );
  }
}
