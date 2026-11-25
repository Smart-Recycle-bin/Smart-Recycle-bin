import 'package:flutter/material.dart';
import '../constants/app_colors.dart';

class ProfileAvatar extends StatelessWidget {
  final String? imageUrl;
  final double size;
  final Color borderColor;
  final double borderWidth;
  final double? iconSize;
  final List<BoxShadow>? boxShadow;

  const ProfileAvatar({
    super.key,
    this.imageUrl,
    this.size = 38,
    this.borderColor = AppColors.mintGreen,
    this.borderWidth = 2,
    this.iconSize,
    this.boxShadow,
  });

  Widget _buildPlaceholder() {
    return Container(
      width: size,
      height: size,
      color: AppColors.mintGreen,
      child: Icon(
        Icons.person,
        color: AppColors.deepForest,
        size: iconSize ?? (size * 0.52),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final trimmed = imageUrl?.trim();
    final hasImage = trimmed != null && trimmed.isNotEmpty;

    Widget child;
    if (!hasImage) {
      child = _buildPlaceholder();
    } else if (trimmed.startsWith('assets/')) {
      child = Image.asset(
        trimmed,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _buildPlaceholder(),
      );
    } else {
      child = Image.network(
        trimmed,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _buildPlaceholder(),
      );
    }

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: borderColor, width: borderWidth),
        boxShadow: boxShadow,
      ),
      child: ClipOval(child: child),
    );
  }
}
