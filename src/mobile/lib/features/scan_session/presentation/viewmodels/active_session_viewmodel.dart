import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/disposal_session_entity.dart';
import '../../domain/repositories/session_repository.dart';

class ActiveSessionViewModel extends ChangeNotifier {
  final SessionRepository sessionRepository;

  ActiveSessionViewModel({required this.sessionRepository});

  DisposalSessionEntity? _currentSession;
  Timer? _countdownTimer;
  int _remainingSeconds = 90;
  bool _isLoading = false;
  String? _errorMessage;

  DisposalSessionEntity? get currentSession => _currentSession;
  int get remainingSeconds => _remainingSeconds;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  String get formattedCountdown {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '$minutes:${seconds.toString().padLeft(2, '0')} Min';
  }

  Future<bool> startSession(String binId, String qrPayload) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await sessionRepository.startSession(
      binId: binId,
      qrPayload: qrPayload,
    );

    _isLoading = false;
    return result.when(
      onSuccess: (session) {
        _currentSession = session;
        _remainingSeconds = session.countdownSeconds;
        _startTimer();
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

  void _startTimer() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
        // Automatically finish session on lock timeout
        endSession();
      }
    });
  }

  Future<bool> endSession() async {
    _countdownTimer?.cancel();
    if (_currentSession == null) return false;

    _isLoading = true;
    notifyListeners();

    final result = await sessionRepository.endSession(_currentSession!.sessionId);
    _isLoading = false;

    return result.when(
      onSuccess: (_) {
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

  @override
  void dispose() {
    _countdownTimer?.cancel();
    super.dispose();
  }
}
