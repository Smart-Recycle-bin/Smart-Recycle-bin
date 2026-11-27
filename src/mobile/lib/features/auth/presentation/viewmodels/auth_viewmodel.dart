import 'package:flutter/foundation.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';

class AuthViewModel extends ChangeNotifier {
  final AuthRepository authRepository;

  AuthViewModel({required this.authRepository});

  bool _isLoading = false;
  String? _errorMessage;
  UserEntity? _currentUser;
  String _pendingVerificationEmail = '';

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  UserEntity? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  String get pendingVerificationEmail => _pendingVerificationEmail;

  set pendingVerificationEmail(String email) {
    _pendingVerificationEmail = email;
    notifyListeners();
  }

  void _setLoading(bool value) {
    _isLoading = value;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  Future<void> init() async {
    _currentUser = await authRepository.getCurrentUser();
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _errorMessage = null;

    final result = await authRepository.login(email: email, password: password);
    _setLoading(false);

    return result.when(
      onSuccess: (user) {
        _currentUser = user;
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

  Future<bool> register(String fullName, String email, String password) async {
    _setLoading(true);
    _errorMessage = null;

    final result = await authRepository.register(
      fullName: fullName,
      email: email,
      password: password,
    );
    _setLoading(false);

    return result.when(
      onSuccess: (_) {
        _pendingVerificationEmail = email;
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

  Future<bool> verifyEmail(String email, String otp) async {
    _setLoading(true);
    _errorMessage = null;

    final result = await authRepository.verifyEmail(email: email, otp: otp);
    _setLoading(false);

    return result.when(
      onSuccess: (_) => true,
      onFailure: (error) {
        _errorMessage = error;
        notifyListeners();
        return false;
      },
    );
  }

  Future<bool> sendPasswordResetOtp(String email) async {
    _setLoading(true);
    _errorMessage = null;

    final result = await authRepository.sendPasswordResetOtp(email: email);
    _setLoading(false);

    return result.when(
      onSuccess: (_) => true,
      onFailure: (error) {
        _errorMessage = error;
        notifyListeners();
        return false;
      },
    );
  }

  void handleSessionExpired() {
    _currentUser = null;
    _isLoading = false;
    _errorMessage = 'Session expired. Please sign in again.';
    notifyListeners();
  }

  Future<void> logout() async {
    _setLoading(true);
    await authRepository.logout();
    _currentUser = null;
    _setLoading(false);
    notifyListeners();
  }
}
