import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../../core/widgets/profile_avatar.dart';
import '../../../profile/presentation/viewmodels/profile_viewmodel.dart';
import '../../../profile/presentation/views/profile_view.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';

class EcoBinAppBar extends StatelessWidget implements PreferredSizeWidget {
  final int? points;
  final String? avatarUrl;
  final VoidCallback? onAvatarTap;
  final bool showPointsAndAvatar;

  const EcoBinAppBar({
    super.key,
    this.points,
    this.avatarUrl,
    this.onAvatarTap,
    this.showPointsAndAvatar = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(65);

  @override
  Widget build(BuildContext context) {
    final walletPoints = context.maybeWatch<WalletViewModel>()?.availablePoints;
    final profilePhoto = context.maybeWatch<ProfileViewModel>()?.user?.profilePhotoUrl;
    final effectivePoints = points ?? walletPoints ?? 0;
    final effectiveAvatarUrl = avatarUrl ?? profilePhoto;
    return SafeArea(
      child: Container(
        height: 65,
        padding: const EdgeInsets.symmetric(horizontal: 14.0),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // EcoBin Logo with Icon
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Image.asset(
                  'assets/images/app_logo.png',
                  width: 34,
                  height: 34,
                ),
                const SizedBox(width: 8),
                Text(
                  'EcoBin',
                  style: AppTypography.headlineCairo.copyWith(
                    fontSize: 20,
                    color: AppColors.deepForest,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),

            // Points Pill & Avatar
            if (showPointsAndAvatar)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Points Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreen,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '$effectivePoints pts',
                      style: AppTypography.badgeText.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Avatar
                  GestureDetector(
                    onTap: onAvatarTap ??
                        () {
                          Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const ProfileView()),
                          );
                        },
                    child: ProfileAvatar(
                      imageUrl: effectiveAvatarUrl,
                      size: 38,
                      borderColor: AppColors.mintGreen,
                      borderWidth: 2,
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }
}
