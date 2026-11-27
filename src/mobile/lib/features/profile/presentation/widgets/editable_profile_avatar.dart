import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/profile_avatar.dart';
import '../viewmodels/profile_viewmodel.dart';

typedef ProfileImagePicker = Future<XFile?> Function(ImageSource source);

enum _PhotoPickerAction { gallery, camera, remove }

/// Interactive circular profile avatar with an active camera upload badge.
class EditableProfileAvatar extends StatelessWidget {
  final String? imageUrl;
  final bool isUploading;
  final double size;
  final VoidCallback? onTap;
  final ProfileImagePicker? onPickImage;

  const EditableProfileAvatar({
    super.key,
    required this.imageUrl,
    this.isUploading = false,
    this.size = 105,
    this.onTap,
    this.onPickImage,
  });

  @override
  Widget build(BuildContext context) {
    final badgeSize = (size * 0.32).clamp(28.0, 36.0);

    return Semantics(
      button: true,
      enabled: !isUploading,
      label: 'Change profile photo',
      child: Material(
        color: Colors.transparent,
        shape: const CircleBorder(),
        child: InkWell(
          customBorder: const CircleBorder(),
          onTap: isUploading
              ? null
              : (onTap ?? () => showProfilePhotoOptions(context, onPickImage: onPickImage)),
          child: Padding(
            padding: const EdgeInsets.all(4),
            child: Stack(
              clipBehavior: Clip.none,
              alignment: Alignment.center,
              children: [
                ProfileAvatar(
                  imageUrl: imageUrl,
                  size: size,
                  borderColor: AppColors.mintGreen,
                  borderWidth: 3,
                  iconSize: size * 0.48,
                ),
                if (isUploading)
                  Container(
                    width: size,
                    height: size,
                    decoration: BoxDecoration(
                      color: Colors.black.withAlpha(110),
                      shape: BoxShape.circle,
                    ),
                    child: const Center(
                      child: CircularProgressIndicator(
                        color: Colors.white,
                        strokeWidth: 2.5,
                      ),
                    ),
                  ),
                Positioned(
                  bottom: 0,
                  right: 2,
                  child: Container(
                    width: badgeSize,
                    height: badgeSize,
                    decoration: BoxDecoration(
                      color: AppColors.deepForest,
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white, width: 2),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(35),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.camera_alt,
                      color: Colors.white,
                      size: badgeSize * 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Opens a modal bottom sheet allowing the user to pick, capture, or remove
/// their profile photo and uploads the selection via [ProfileViewModel].
Future<void> showProfilePhotoOptions(
  BuildContext context, {
  ProfileImagePicker? onPickImage,
}) async {
  final vm = context.read<ProfileViewModel>();
  final messenger = ScaffoldMessenger.maybeOf(context);
  final hasPhoto = vm.user?.profilePhotoUrl?.trim().isNotEmpty == true;

  final action = await showModalBottomSheet<_PhotoPickerAction>(
    context: context,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
    ),
    builder: (sheetContext) => SafeArea(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 12),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Text(
              'Profile Photo',
              style: AppTypography.titlePlex.copyWith(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: AppColors.deepForest,
              ),
            ),
            const SizedBox(height: 8),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined, color: AppColors.primaryGreen),
              title: const Text('Choose from Gallery'),
              onTap: () => Navigator.of(sheetContext).pop(_PhotoPickerAction.gallery),
            ),
            ListTile(
              leading: const Icon(Icons.camera_alt_outlined, color: AppColors.deepForest),
              title: const Text('Take a Photo'),
              onTap: () => Navigator.of(sheetContext).pop(_PhotoPickerAction.camera),
            ),
            if (hasPhoto)
              ListTile(
                leading: const Icon(Icons.delete_outline, color: AppColors.danger),
                title: const Text('Remove Photo', style: TextStyle(color: AppColors.danger)),
                onTap: () => Navigator.of(sheetContext).pop(_PhotoPickerAction.remove),
              ),
          ],
        ),
      ),
    ),
  );

  if (action == null) return;

  if (action == _PhotoPickerAction.remove) {
    final removed = await vm.removeProfilePhoto();
    messenger?.showSnackBar(
      SnackBar(
        content: Text(
          removed ? 'Profile photo removed.' : (vm.errorMessage ?? 'Failed to remove photo.'),
        ),
        backgroundColor: removed ? AppColors.primaryGreen : AppColors.danger,
      ),
    );
    return;
  }

  final source = action == _PhotoPickerAction.camera ? ImageSource.camera : ImageSource.gallery;
  XFile? picked;
  try {
    picked = await (onPickImage?.call(source) ??
        ImagePicker().pickImage(
          source: source,
          maxWidth: 1024,
          maxHeight: 1024,
          imageQuality: 85,
        ));
  } catch (e) {
    messenger?.showSnackBar(
      SnackBar(
        content: Text('Could not access image: $e'),
        backgroundColor: AppColors.danger,
      ),
    );
    return;
  }

  if (picked == null) return;

  final bytes = await picked.readAsBytes();
  final safeFileName = picked.name.trim().isNotEmpty ? picked.name.trim() : 'avatar.jpg';
  final updated = await vm.updateProfilePhoto(
    photoBytes: bytes,
    fileName: safeFileName,
  );

  messenger?.showSnackBar(
    SnackBar(
      content: Text(
        updated ? 'Profile photo updated!' : (vm.errorMessage ?? 'Failed to upload photo.'),
      ),
      backgroundColor: updated ? AppColors.primaryGreen : AppColors.danger,
    ),
  );
}
