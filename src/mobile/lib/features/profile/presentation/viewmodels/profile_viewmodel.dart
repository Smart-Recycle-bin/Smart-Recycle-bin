import 'package:flutter/foundation.dart';
import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/auth/domain/entities/user_entity.dart';
import 'package:ecobin/features/profile/domain/entities/support_ticket_entity.dart';
import 'package:ecobin/features/profile/domain/repositories/profile_repository.dart';

class ProfileViewModel extends ChangeNotifier {
  static const int maxPhotoBytes = 4 * 1024 * 1024;

  final ProfileRepository profileRepository;

  ProfileViewModel({required this.profileRepository});

  UserEntity? _user;
  List<SupportTicketEntity> _tickets = [];
  bool _isLoading = false;
  bool _isUploadingPhoto = false;
  bool _isLoadingTickets = false;
  String? _errorMessage;
  String? _supportErrorMessage;

  UserEntity? get user => _user;
  List<SupportTicketEntity> get tickets => _tickets;
  bool get isLoading => _isLoading;
  bool get isUploadingPhoto => _isUploadingPhoto;
  bool get isLoadingTickets => _isLoadingTickets;
  String? get errorMessage => _errorMessage;
  String? get supportErrorMessage => _supportErrorMessage;

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
      onFailure: (error) => _errorMessage = error.replaceFirst('Exception: ', ''),
    );

    notifyListeners();
  }

  bool _handleProfileUpdateResult(Result<UserEntity> result) {
    return result.when(
      onSuccess: (updated) {
        final previous = _user;
        _user = UserEntity(
          userId: updated.userId.isNotEmpty ? updated.userId : (previous?.userId ?? ''),
          email: updated.email.isNotEmpty ? updated.email : (previous?.email ?? ''),
          displayName: updated.displayName,
          role: updated.role.isNotEmpty ? updated.role : (previous?.role ?? 'USER_CITIZEN'),
          phoneNumber: updated.phoneNumber,
          profilePhotoUrl: updated.profilePhotoUrl,
          points: previous?.points ?? updated.points,
        );
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

  Future<bool> updateProfile(
    String displayName,
    String? phoneNumber, {
    String? profilePhotoUrl,
    bool removePhoto = false,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final result = await profileRepository.updateProfile(
      displayName: displayName,
      phoneNumber: phoneNumber,
      profilePhotoUrl: profilePhotoUrl,
      removePhoto: removePhoto,
    );

    _isLoading = false;
    return _handleProfileUpdateResult(result);
  }

  Future<bool> updateProfilePhoto({
    required List<int> photoBytes,
    String? fileName,
  }) async {
    if (photoBytes.isEmpty) {
      _errorMessage = 'Selected image file is empty.';
      notifyListeners();
      return false;
    }
    if (photoBytes.length > maxPhotoBytes) {
      _errorMessage = 'Photo must be 4 MB or smaller.';
      notifyListeners();
      return false;
    }

    _isUploadingPhoto = true;
    _errorMessage = null;
    notifyListeners();

    final result = await profileRepository.updateProfile(
      photoBytes: photoBytes,
      photoFileName: fileName,
    );

    _isUploadingPhoto = false;
    return _handleProfileUpdateResult(result);
  }

  Future<bool> removeProfilePhoto() async {
    _isUploadingPhoto = true;
    _errorMessage = null;
    notifyListeners();

    final result = await profileRepository.updateProfile(removePhoto: true);

    _isUploadingPhoto = false;
    return _handleProfileUpdateResult(result);
  }

  Future<void> fetchSupportTickets() async {
    _isLoadingTickets = true;
    _supportErrorMessage = null;
    notifyListeners();

    final result = await profileRepository.getSupportTickets();
    _isLoadingTickets = false;

    result.when(
      onSuccess: (list) => _tickets = list,
      onFailure: (error) => _supportErrorMessage = error.replaceFirst('Exception: ', ''),
    );

    notifyListeners();
  }

  Future<SupportTicketEntity?> submitSupportTicket(
    String description, {
    String category = 'general_inquiry',
    String? sessionId,
  }) async {
    _isLoading = true;
    _supportErrorMessage = null;
    notifyListeners();

    final result = await profileRepository.submitSupportTicket(
      category: category,
      description: description,
      sessionId: sessionId,
    );

    _isLoading = false;

    return result.when(
      onSuccess: (ticket) {
        _tickets = [ticket, ..._tickets];
        notifyListeners();
        return ticket;
      },
      onFailure: (error) {
        _supportErrorMessage = error.replaceFirst('Exception: ', '');
        notifyListeners();
        return null;
      },
    );
  }
}
