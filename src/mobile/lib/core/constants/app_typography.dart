import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTypography {
  AppTypography._();

  /// Headline using IBM Plex Sans
  static TextStyle get headlineLarge => GoogleFonts.ibmPlexSans(
        fontSize: 28,
        fontWeight: FontWeight.bold,
        color: AppColors.deepForest,
      );

  static TextStyle get headlineCairo => headlineLarge;

  static TextStyle get titlePlex => GoogleFonts.ibmPlexSans(
        fontSize: 22,
        fontWeight: FontWeight.bold,
        color: AppColors.darkSlate,
      );

  static TextStyle get bodyPlex => GoogleFonts.ibmPlexSans(
        fontSize: 15,
        fontWeight: FontWeight.normal,
        color: AppColors.textPrimary,
      );

  static TextStyle get bodyMedium => GoogleFonts.ibmPlexSans(
        fontSize: 14,
        fontWeight: FontWeight.normal,
        color: AppColors.textSecondary,
      );

  static TextStyle get subtitlePlex => GoogleFonts.ibmPlexSans(
        fontSize: 14,
        fontWeight: FontWeight.w500,
        color: AppColors.textSecondary,
      );

  static TextStyle get buttonText => GoogleFonts.ibmPlexSans(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: Colors.white,
      );

  static TextStyle get badgeText => GoogleFonts.ibmPlexSans(
        fontSize: 12,
        fontWeight: FontWeight.w600,
      );
}
