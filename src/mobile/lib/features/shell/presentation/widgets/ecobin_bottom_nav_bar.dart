import 'package:flutter/material.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';

class EcoBinBottomNavBar extends StatelessWidget {
  /// The currently selected tab index:
  /// 0: Map
  /// 1: Survey
  /// 2: Scan (center floating button)
  /// 3: Market
  /// 4: Wallet
  /// -1 or other: None selected (e.g. Profile screen, Page 14 of UI design)
  final int currentIndex;
  final ValueChanged<int> onItemTapped;

  const EcoBinBottomNavBar({
    super.key,
    required this.currentIndex,
    required this.onItemTapped,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: SafeArea(
        top: false,
        child: Container(
          height: 68,
          decoration: const BoxDecoration(
            color: Colors.white,
            border: Border(
              top: BorderSide(
                color: Color(0xFFE2E8F0),
                width: 1.0,
              ),
            ),
          ),
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.bottomCenter,
            children: [
              // Navigation items row
              Positioned.fill(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    // Map Tab
                    _NavBarItem(
                      icon: Icons.map_outlined,
                      label: 'Map',
                      isSelected: currentIndex == 0,
                      onTap: () => onItemTapped(0),
                    ),

                    // Survey Tab (Note document with edit pencil)
                    _NavBarItem(
                      icon: Icons.note_alt_outlined,
                      label: 'Survey',
                      isSelected: currentIndex == 1,
                      onTap: () => onItemTapped(1),
                    ),

                    // Center Floating Scan Button (Circle floats above, label on bar)
                    _CenterScanNavItem(
                      onTap: () => onItemTapped(2),
                    ),

                    // Market Tab
                    _NavBarItem(
                      icon: Icons.shopping_bag_outlined,
                      label: 'Market',
                      isSelected: currentIndex == 3,
                      onTap: () => onItemTapped(3),
                    ),

                    // Wallet Tab
                    _NavBarItem(
                      icon: Icons.account_balance_wallet_outlined,
                      label: 'Wallet',
                      isSelected: currentIndex == 4,
                      onTap: () => onItemTapped(4),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _NavBarItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _NavBarItem({
    required this.icon,
    required this.label,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final color = isSelected ? AppColors.deepForest : const Color(0xFF64748B);

    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Icon(
                icon,
                color: color,
                size: 24,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: AppTypography.badgeText.copyWith(
                  color: color,
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CenterScanNavItem extends StatelessWidget {
  final VoidCallback onTap;

  const _CenterScanNavItem({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: SizedBox(
          height: 68,
          child: Stack(
            clipBehavior: Clip.none,
            alignment: Alignment.center,
            children: [
              // "Scan" label aligned with all other nav labels
              Positioned(
                bottom: 8,
                child: Text(
                  'Scan',
                  style: AppTypography.badgeText.copyWith(
                    color: const Color(0xFF64748B),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),

              // Floating deep forest green circular button with white QR icon
              Positioned(
                top: -20,
                child: Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: AppColors.deepForest,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(45),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.qr_code_scanner_rounded,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
