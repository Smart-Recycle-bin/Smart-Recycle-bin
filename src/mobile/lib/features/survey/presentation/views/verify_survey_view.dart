import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../shell/presentation/widgets/ecobin_app_bar.dart';
import '../viewmodels/verify_survey_viewmodel.dart';
import '../../../shell/presentation/views/main_shell_view.dart';

class VerifySurveyView extends StatefulWidget {
  final String surveyId;
  final bool isReadOnly;

  const VerifySurveyView({
    super.key,
    required this.surveyId,
    this.isReadOnly = false,
  });

  @override
  State<VerifySurveyView> createState() => _VerifySurveyViewState();
}

class _VerifySurveyViewState extends State<VerifySurveyView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<VerifySurveyViewModel>().loadSurvey(widget.surveyId);
    });
  }

  final List<String> _categories = ['Plastic', 'Metal', 'Paper', 'Organic'];

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<VerifySurveyViewModel>();
    final items = vm.items;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: const EcoBinAppBar(points: 1420),
      body: vm.isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primaryGreen),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Title Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Verify Items Survey',
                            style: AppTypography.headlineCairo.copyWith(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: AppColors.deepForest,
                            ),
                          ),
                          Text(
                            'Survey#${vm.survey?.surveyNumber ?? 2043}',
                            style: AppTypography.subtitlePlex.copyWith(
                              fontSize: 14,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      Text(
                        '+21 PTS',
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryGreen,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Detected Items List
                  ...List.generate(items.length, (index) {
                    final item = items[index];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 14),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(6),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Item Camera Snapshot
                          ClipRRect(
                            borderRadius: BorderRadius.circular(14),
                            child: Image.network(
                              item.imageUrl,
                              width: 80,
                              height: 80,
                              fit: BoxFit.cover,
                              errorBuilder: (context, error, stackTrace) => Container(
                                width: 80,
                                height: 80,
                                color: const Color(0xFFCBD5E1),
                                child: const Icon(Icons.broken_image, color: Colors.white),
                              ),
                            ),
                          ),
                          const SizedBox(width: 14),

                          // Item tags and selection
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: AppColors.mintGreen.withAlpha(50),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        'Detected: ${item.detectedWasteType}',
                                        style: AppTypography.badgeText.copyWith(
                                          color: AppColors.deepForest,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    Text(
                                      '+${item.points} PTS',
                                      style: AppTypography.badgeText.copyWith(
                                        color: AppColors.primaryGreen,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                // Category selection chips
                                Wrap(
                                  spacing: 6,
                                  runSpacing: 6,
                                  children: _categories.map((cat) {
                                    final isSelected = item.confirmedWasteType
                                            .toLowerCase() ==
                                        cat.toLowerCase();
                                    return GestureDetector(
                                      onTap: widget.isReadOnly
                                          ? null
                                          : () => vm.updateItemCategory(index, cat),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 10, vertical: 5),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? AppColors.deepForest
                                              : const Color(0xFFCBD5E1),
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Text(
                                          cat,
                                          style: AppTypography.badgeText.copyWith(
                                            color: isSelected
                                                ? Colors.white
                                                : AppColors.darkSlate,
                                            fontWeight: isSelected
                                                ? FontWeight.bold
                                                : FontWeight.w500,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 10),

                  // AI Correctness Rating Card
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(6),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'AI Correctness Rating',
                              style: AppTypography.titlePlex.copyWith(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkSlate,
                              ),
                            ),
                            Text(
                              'Optional',
                              style: AppTypography.subtitlePlex.copyWith(
                                fontSize: 12,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),

                        // 5 Stars
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: List.generate(5, (starIndex) {
                            final filled = starIndex < vm.aiRating;
                            return IconButton(
                              icon: Icon(
                                filled ? Icons.star_rounded : Icons.star_outline_rounded,
                                color: AppColors.primaryGreen,
                                size: 36,
                              ),
                              onPressed: widget.isReadOnly
                                  ? null
                                  : () => vm.setAiRating(starIndex + 1),
                            );
                          }),
                        ),
                        const SizedBox(height: 14),

                        // Total Reward
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'TOTAL REWARD',
                              style: AppTypography.badgeText.copyWith(
                                color: AppColors.textSecondary,
                                letterSpacing: 1.0,
                                fontSize: 13,
                              ),
                            ),
                            Text(
                              '+${vm.totalRewardPoints} PTS',
                              style: AppTypography.titlePlex.copyWith(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryGreen,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        // Submit Button
                        if (!widget.isReadOnly)
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.deepForest,
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            onPressed: () async {
                              final success = await vm.submitSurvey();
                              if (context.mounted && success) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(
                                    content: Text('50 EcoPoints credited to your wallet!'),
                                    backgroundColor: AppColors.primaryGreen,
                                  ),
                                );
                                Navigator.of(context).pushAndRemoveUntil(
                                  MaterialPageRoute(
                                    builder: (_) => const MainShellView(initialIndex: 0),
                                  ),
                                  (route) => false,
                                );
                              }
                            },
                            child: const Text('Submit & Collect Points'),
                          )
                        else
                          ElevatedButton(
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.darkSlate,
                              foregroundColor: Colors.white,
                              minimumSize: const Size(double.infinity, 50),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(26),
                              ),
                            ),
                            onPressed: () => Navigator.of(context).pop(),
                            child: const Text('Done'),
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
