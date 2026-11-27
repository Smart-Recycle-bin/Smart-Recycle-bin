import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/core/constants/app_colors.dart';
import 'package:ecobin/core/constants/app_typography.dart';
import 'package:ecobin/core/utils/provider_helpers.dart';
import 'package:ecobin/features/shell/presentation/widgets/ecobin_app_bar.dart';
import 'package:ecobin/features/shell/presentation/widgets/ecobin_bottom_nav_bar.dart';
import 'package:ecobin/features/shell/presentation/views/main_shell_view.dart';
import 'package:ecobin/features/scan_session/presentation/views/scan_bin_view.dart';
import 'package:ecobin/features/profile/presentation/viewmodels/profile_viewmodel.dart';
import 'package:ecobin/features/auth/presentation/viewmodels/auth_viewmodel.dart';
import 'package:ecobin/features/auth/presentation/views/login_view.dart';
import 'package:ecobin/features/wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../widgets/editable_profile_avatar.dart';
import 'edit_profile_view.dart';
import 'support_view.dart';

class ProfileView extends StatefulWidget {
  final bool isInsideShell;

  const ProfileView({super.key, this.isInsideShell = false});

  @override
  State<ProfileView> createState() => _ProfileViewState();
}

class _ProfileViewState extends State<ProfileView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshProfile(context);
    });
  }

  Future<void> _refreshProfile(BuildContext context) async {
    final profileVm = context.read<ProfileViewModel>();
    final walletVm = context.maybeRead<WalletViewModel>();
    await Future.wait([
      profileVm.fetchProfile(),
      if (walletVm != null) walletVm.fetchWalletData(),
    ]);
  }

  void _showLegalDialog(BuildContext context, String title, String content) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Text(title, style: AppTypography.titlePlex),
        content: SingleChildScrollView(
          child: Text(content, style: AppTypography.bodyPlex),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ProfileViewModel>();
    final user = vm.user;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: const EcoBinAppBar(showPointsAndAvatar: false),
      body: RefreshIndicator(
        onRefresh: () => _refreshProfile(context),
        color: AppColors.primaryGreen,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'My profile',
                      overflow: TextOverflow.ellipsis,
                      style: AppTypography.headlineCairo.copyWith(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForest,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh_rounded, color: AppColors.deepForest),
                    tooltip: 'Refresh',
                    onPressed: vm.isLoading ? null : () => _refreshProfile(context),
                  ),
                ],
              ),
              const SizedBox(height: 2),
            Text(
              'Your account, your greener everyday.',
              style: AppTypography.subtitlePlex.copyWith(
                fontSize: 14,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 20),

            // Profile Card (White Card with Avatar & Name)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(6),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    'Your EcoBin profile',
                    style: AppTypography.titlePlex.copyWith(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.deepForest,
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Interactive Avatar with Camera Upload Button
                  EditableProfileAvatar(
                    imageUrl: user?.profilePhotoUrl,
                    isUploading: vm.isUploadingPhoto,
                  ),
                  const SizedBox(height: 16),

                  // User Full Name & Account Details
                  Text(
                    user?.displayName ?? (vm.isLoading ? 'Loading...' : 'User'),
                    style: AppTypography.headlineCairo.copyWith(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkSlate,
                    ),
                  ),
                  if (user?.email.isNotEmpty == true) ...[
                    const SizedBox(height: 4),
                    Text(
                      user!.email,
                      style: AppTypography.bodyPlex.copyWith(
                        fontSize: 13.5,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                  if (user?.phoneNumber != null && user!.phoneNumber!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      user.phoneNumber!,
                      style: AppTypography.bodyMedium.copyWith(
                        fontSize: 13,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 24),

            // ACCOUNT Section
            Text(
              'ACCOUNT',
              style: AppTypography.badgeText.copyWith(
                color: AppColors.textSecondary,
                letterSpacing: 1.1,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(5),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                child: ListTile(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 4),
                  title: Text(
                    'Edit info',
                    style: AppTypography.titlePlex.copyWith(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkSlate,
                    ),
                  ),
                  subtitle: Text(
                    'Update your personal details',
                    style: AppTypography.bodyMedium.copyWith(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                  onTap: () async {
                    await Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const EditProfileView()),
                    );
                    if (context.mounted) {
                      await _refreshProfile(context);
                    }
                  },
                ),
              ),
            ),
            const SizedBox(height: 20),

            // HELP & LEGAL Section
            Text(
              'HELP & LEGAL',
              style: AppTypography.badgeText.copyWith(
                color: AppColors.textSecondary,
                letterSpacing: 1.1,
                fontSize: 12,
              ),
            ),
            const SizedBox(height: 8),

            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(5),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Material(
                color: Colors.transparent,
                borderRadius: BorderRadius.circular(20),
                child: Column(
                  children: [
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                      title: Text(
                        'Support',
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkSlate,
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const SupportView()),
                        );
                      },
                    ),
                    const Divider(height: 1, indent: 20, endIndent: 20),
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                      title: Text(
                        'Privacy policy',
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkSlate,
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                      onTap: () {
                        _showLegalDialog(
                          context,
                          'Privacy Policy',
                          'EcoBin respects your privacy and adheres to data anonymization guidelines for recycling and waste collection activities.',
                        );
                      },
                    ),
                    const Divider(height: 1, indent: 20, endIndent: 20),
                    ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 2),
                      title: Text(
                        'Terms of service',
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.darkSlate,
                        ),
                      ),
                      trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
                      onTap: () {
                        _showLegalDialog(
                          context,
                          'Terms of Service',
                          'By using EcoBin smart bins, you agree to fair waste classification verification and respectful use of rewards vouchers.',
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 28),

            // Logout Button (Dark Slate / Deep Forest button)
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.darkSlate,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 52),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(26),
                ),
              ),
              onPressed: () async {
                await context.read<AuthViewModel>().logout();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginView()),
                    (route) => false,
                  );
                }
              },
              child: const Text('Logout'),
            ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
      bottomNavigationBar: widget.isInsideShell
          ? null
          : EcoBinBottomNavBar(
              currentIndex: -1,
              onItemTapped: (index) {
                if (index == 2) {
                  Navigator.of(context).push(
                    MaterialPageRoute(builder: (_) => const ScanBinView()),
                  );
                  return;
                }
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => MainShellView(initialIndex: index)),
                  (route) => false,
                );
              },
            ),
    );
  }
}
