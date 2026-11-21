import 'package:flutter/foundation.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/profile/domain/repositories/profile_repository.dart';

class ProfileViewModel extends ChangeNotifier {
  final ProfileRepository profileRepository;

  ProfileViewModel({required this.profileRepository});

  UserEntity? _user;
  bool _isLoading = false;
  String? _errorMessage;

  UserEntity? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  Future<void> init() async {
    await fetchProfile();
  }

  Future<void> fetchProfile() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await profileRepository.getProfile();
    _isLoading = false;

    result.when(
      onSuccess: (data) => _user = data,
      onFailure: (error) => _errorMessage = error,
    );

    notifyListeners();
  }

  Future<bool> updateProfile(String displayName, String? phoneNumber) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await profileRepository.updateProfile(
      displayName: displayName,
      phoneNumber: phoneNumber,
    );

    _isLoading = false;

    return result.when(
      onSuccess: (updated) {
        _user = updated;
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

  Future<bool> submitSupportTicket(String description, {String? sessionId}) async {
    _isLoading = true;
    notifyListeners();

    final result = await profileRepository.submitSupportTicket(
      category: 'general_inquiry',
      description: description,
      sessionId: sessionId,
    );

    _isLoading = false;
    notifyListeners();

    return result.when(
      onSuccess: (_) => true,
      onFailure: (_) => false,
    );
  }
}
