import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/core/constants/app_colors.dart';
import 'package:ecobin/core/constants/app_typography.dart';
import 'package:ecobin/features/shell/presentation/widgets/ecobin_app_bar.dart';
import 'package:ecobin/features/scan_session/presentation/viewmodels/active_session_viewmodel.dart';
import 'package:ecobin/features/survey/presentation/views/verify_survey_view.dart';
import 'package:ecobin/features/profile/presentation/views/support_view.dart';

class ActiveSessionView extends StatefulWidget {
  const ActiveSessionView({super.key});

  @override
  State<ActiveSessionView> createState() => _ActiveSessionViewState();
}

class _ActiveSessionViewState extends State<ActiveSessionView> {
  bool _navigatedToSurvey = false;

  void _navigateToSurvey(String? surveyId) {
    if (_navigatedToSurvey || !mounted) return;
    _navigatedToSurvey = true;
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(
        builder: (_) => VerifySurveyView(surveyId: surveyId ?? 'srv-2043'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ActiveSessionViewModel>();
    final session = vm.currentSession;
    final items = session?.items ?? [];

    if (session != null && !session.isActive && !_navigatedToSurvey) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _navigateToSurvey(session.surveyId);
      });
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: const EcoBinAppBar(),
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
                      '+${session?.totalPoints ?? 0} PTS',
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
            if (items.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.sensors_rounded, color: AppColors.primaryGreen),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Waiting for items from bin camera & AI evaluation...',
                        style: AppTypography.bodyPlex.copyWith(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ],
                ),
              )
            else
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

            if (vm.errorMessage != null) ...[
              Text(
                vm.errorMessage!,
                style: AppTypography.bodyPlex.copyWith(
                  color: AppColors.danger,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 10),
            ],

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
              icon: vm.isLoading
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Icon(Icons.check_circle_outline, size: 22),
              label: const Text('Finish Session'),
              onPressed: vm.isLoading
                  ? null
                  : () async {
                      final ended = await vm.endSession();
                      if (ended && context.mounted) {
                        _navigateToSurvey(vm.currentSession?.surveyId);
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
                      builder: (_) => SupportView(sessionId: session?.sessionId ?? ''),
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
                            text: 'Verify your detected items after finishing to earn ',
                            style: AppTypography.bodyPlex.copyWith(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                            children: [
                              TextSpan(
                                text: '+${session?.totalPoints ?? 0} Points',
                                style: const TextStyle(
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
