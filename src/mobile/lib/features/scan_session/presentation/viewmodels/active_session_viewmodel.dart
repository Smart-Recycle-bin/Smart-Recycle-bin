import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../domain/entities/disposal_session_entity.dart';
import '../../domain/repositories/session_repository.dart';

class ActiveSessionViewModel extends ChangeNotifier {
  final SessionRepository sessionRepository;

  ActiveSessionViewModel({required this.sessionRepository});

  DisposalSessionEntity? _currentSession;
  Timer? _countdownTimer;
  Timer? _pollTimer;
  bool _isPolling = false;
  int _remainingSeconds = 60;
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
    _stopTimers();
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
        _startTimers();
        notifyListeners();
        return true;
      },
      onFailure: (error) {
        _errorMessage = error.replaceFirst('Exception: ', '');
        notifyListeners();
        return false;
      },
    );
  }

  void _startTimers() {
    _stopTimers();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_remainingSeconds > 0) {
        _remainingSeconds--;
        notifyListeners();
      } else {
        timer.cancel();
        endSession();
      }
    });

    _pollTimer = Timer.periodic(const Duration(seconds: 2), (_) {
      syncSessionStatus();
    });
  }

  void _stopTimers() {
    _countdownTimer?.cancel();
    _countdownTimer = null;
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  /// Syncs newly ingested bin items and rolling +60s expiry from the backend.
  Future<void> syncSessionStatus() async {
    final session = _currentSession;
    if (session == null || !session.isActive || _isPolling || _isLoading) return;

    _isPolling = true;
    final result = await sessionRepository.getSessionStatus(session.sessionId);
    _isPolling = false;

    result.when(
      onSuccess: (updated) {
        _currentSession = updated;
        _remainingSeconds = updated.countdownSeconds;
        if (!updated.isActive) {
          _stopTimers();
        }
        notifyListeners();
      },
      onFailure: (_) {},
    );
  }

  Future<bool> endSession() async {
    _stopTimers();
    if (_currentSession == null || _isLoading) return false;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await sessionRepository.endSession(_currentSession!.sessionId);
    _isLoading = false;

    return result.when(
      onSuccess: (endedSession) {
        _currentSession = endedSession;
        _remainingSeconds = 0;
        notifyListeners();
        return true;
      },
      onFailure: (error) {
        _errorMessage = error.replaceFirst('Exception: ', '');
        notifyListeners();
        return false;
      },
    );
  }

  @override
  void dispose() {
    _stopTimers();
    super.dispose();
  }
}
