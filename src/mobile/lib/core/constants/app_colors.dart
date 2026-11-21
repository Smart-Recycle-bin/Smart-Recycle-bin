import 'package:flutter/material.dart';

/// EcoBin Brand Colors extracted directly from design spec (Page 1):
/// #1E293B (Dark Slate / Charcoal)
/// #10B981 (Emerald Green / Primary)
/// #34D399 (Mint / Light Green)
/// #064E3B (Deep Forest Green / Dark Accent)
class AppColors {
  AppColors._();

  // Core Brand Palette
  static const Color darkSlate = Color(0xFF1E293B);
  static const Color primaryGreen = Color(0xFF10B981);
  static const Color mintGreen = Color(0xFF34D399);
  static const Color deepForest = Color(0xFF064E3B);

  // Backgrounds & Neutrals
  static const Color backgroundLight = Color(0xFFF8FAFC);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color cardBg = Color(0xFFFFFFFF);
  static const Color inputBorder = Color(0xFFCBD5E1);
  static const Color textPrimary = Color(0xFF0F172A);
  static const Color textSecondary = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  // Status & Badges
  static const Color success = Color(0xFF10B981);
  static const Color warning = Color(0xFFF59E0B);
  static const Color danger = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Gradient Helpers
  static const LinearGradient heroCardGradient = LinearGradient(
    colors: [Color(0xFF064E3B), Color(0xFF047857)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient mintAccentGradient = LinearGradient(
    colors: [Color(0xFF34D399), Color(0xFF10B981)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
