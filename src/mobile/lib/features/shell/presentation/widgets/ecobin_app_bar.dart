import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../profile/presentation/views/profile_view.dart';

class EcoBinAppBar extends StatelessWidget implements PreferredSizeWidget {
  final int points;
  final String? avatarUrl;
  final VoidCallback? onAvatarTap;
  final bool showPointsAndAvatar;

  const EcoBinAppBar({
    super.key,
    this.points = 1420,
    this.avatarUrl,
    this.onAvatarTap,
    this.showPointsAndAvatar = true,
  });

  @override
  Size get preferredSize => const Size.fromHeight(65);

  @override
  Widget build(BuildContext context) {
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
                      '$points pts',
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
                    child: Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(color: AppColors.mintGreen, width: 2),
                      ),
                      child: ClipOval(
                        child: Image.network(
                          avatarUrl ?? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                          width: 38,
                          height: 38,
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => Container(
                            width: 38,
                            height: 38,
                            color: AppColors.mintGreen,
                            child: const Icon(Icons.person, color: AppColors.deepForest, size: 20),
                          ),
                        ),
                      ),
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
