import 'package:flutter/foundation.dart';
import '../../domain/entities/survey_entity.dart';
import '../../domain/repositories/survey_repository.dart';

class SurveysListViewModel extends ChangeNotifier {
  final SurveyRepository surveyRepository;

  SurveysListViewModel({required this.surveyRepository});

  List<SurveyEntity> _surveys = [];
  String _activeFilter = 'All'; // 'All', 'Waiting', 'Done'
  bool _isLoading = false;
  String? _errorMessage;
  int _pendingPoints = 71;

  List<SurveyEntity> get surveys => _surveys;
  String get activeFilter => _activeFilter;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get pendingPoints => _pendingPoints;

  List<SurveyEntity> get filteredSurveys {
    if (_activeFilter == 'Waiting') {
      return _surveys.where((s) => s.isWaiting).toList();
    } else if (_activeFilter == 'Done') {
      return _surveys.where((s) => !s.isWaiting).toList();
    }
    return _surveys;
  }

  Future<void> fetchSurveys() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await surveyRepository.getSurveys();
    _isLoading = false;

    result.when(
      onSuccess: (data) {
        _surveys = data;
        _pendingPoints = _surveys
            .where((s) => s.isWaiting)
            .fold(0, (sum, s) => sum + s.points);
        if (_pendingPoints == 0) _pendingPoints = 71;
      },
      onFailure: (error) {
        _errorMessage = error;
      },
    );
    notifyListeners();
  }

  void setFilter(String filter) {
    _activeFilter = filter;
    notifyListeners();
  }
}
