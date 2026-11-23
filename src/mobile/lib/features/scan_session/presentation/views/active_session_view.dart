import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/core/constants/app_colors.dart';
import 'package:ecobin/core/constants/app_typography.dart';
import 'package:ecobin/features/shell/presentation/widgets/ecobin_app_bar.dart';
import 'package:ecobin/features/scan_session/presentation/viewmodels/active_session_viewmodel.dart';
import 'package:ecobin/features/survey/presentation/views/verify_survey_view.dart';
import 'package:ecobin/features/profile/presentation/views/support_view.dart';

class ActiveSessionView extends StatelessWidget {
  const ActiveSessionView({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ActiveSessionViewModel>();
    final session = vm.currentSession;
    final items = session?.items ?? [];

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: const EcoBinAppBar(points: 1420),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Screen Header
            Text(
              '${session?.binName ?? "Bin#210"} Active Bin',
              style: AppTypography.headlineCairo.copyWith(
                fontSize: 22,
                color: AppColors.deepForest,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              'The Bin is Active You Can Throw Your Trash Now',
              style: AppTypography.subtitlePlex.copyWith(
                color: AppColors.primaryGreen,
                fontWeight: FontWeight.w600,
                fontSize: 13,
              ),
            ),
            const SizedBox(height: 16),

            // Auto-Lock Countdown Card
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(8),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.primaryGreen.withAlpha(30),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.delete_outline_rounded,
                      color: AppColors.deepForest,
                      size: 26,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          session?.binName ?? 'Bin#210',
                          style: AppTypography.titlePlex.copyWith(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkSlate,
                          ),
                        ),
                        Text(
                          'Auto-Lock countdown',
                          style: AppTypography.subtitlePlex.copyWith(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        vm.formattedCountdown,
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryGreen,
                        ),
                      ),
                      Text(
                        'REMAINING',
                        style: AppTypography.badgeText.copyWith(
                          fontSize: 10,
                          color: AppColors.darkSlate,
                          letterSpacing: 0.8,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Session Deposit & Total Points Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Session Deposit',
                      style: AppTypography.subtitlePlex.copyWith(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${items.length} Items Detected',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForest,
                      ),
                    ),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      'Total Points',
                      style: AppTypography.subtitlePlex.copyWith(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '+${session?.totalPoints ?? 35} PTS',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryGreen,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Detected Items List (Cards with green recycling icon)
            ...items.map((item) {
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha(6),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.recycling_rounded,
                      color: AppColors.primaryGreen,
                      size: 26,
                    ),
                    const SizedBox(width: 14),
                    Text(
                      item.displayName,
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.darkSlate,
                      ),
                    ),
                    const Spacer(),
                    Text(
                      '+${item.points} PTS',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForest,
                      ),
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 14),

            // Information prompt
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.info,
                  color: AppColors.deepForest,
                  size: 18,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You can insert more items! Bin automatically locks when timer ends or when you tap Finish.',
                    style: AppTypography.bodyPlex.copyWith(
                      fontSize: 12,
                      color: AppColors.darkSlate,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 22),

            // Finish Session Button
            ElevatedButton.icon(
              icon: const Icon(Icons.check_circle_outline, size: 22),
              label: const Text('Finish Session'),
              onPressed: () async {
                await vm.endSession();
                if (context.mounted) {
                  Navigator.of(context).pushReplacement(
                    MaterialPageRoute(
                      builder: (_) => const VerifySurveyView(surveyId: 'srv-2043'),
                    ),
                  );
                }
              },
            ),
            const SizedBox(height: 14),

            // Having Trouble? Tap for Help link
            Center(
              child: GestureDetector(
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => const SupportView(sessionId: 's-9021'),
                    ),
                  );
                },
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(
                      Icons.headset_mic_outlined,
                      color: AppColors.deepForest,
                      size: 18,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      'Having Trouble? Tap for Help',
                      style: AppTypography.subtitlePlex.copyWith(
                        color: AppColors.deepForest,
                        fontWeight: FontWeight.w600,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Validation Alert Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withAlpha(8),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE2E8F0),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.notifications_active_outlined,
                      color: AppColors.darkSlate,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Validation Alert',
                          style: AppTypography.titlePlex.copyWith(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.darkSlate,
                          ),
                        ),
                        const SizedBox(height: 4),
                        RichText(
                          text: TextSpan(
                            text: 'You\'ll receive a validation survey notification in ~2 mins to verify items and earn ',
                            style: AppTypography.bodyPlex.copyWith(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                            children: const [
                              TextSpan(
                                text: '+35 Points',
                                style: TextStyle(
                                  color: AppColors.primaryGreen,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
