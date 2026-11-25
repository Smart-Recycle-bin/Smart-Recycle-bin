import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../shell/presentation/widgets/ecobin_app_bar.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../viewmodels/surveys_list_viewmodel.dart';
import 'verify_survey_view.dart';

class SurveysListView extends StatefulWidget {
  const SurveysListView({super.key});

  @override
  State<SurveysListView> createState() => _SurveysListViewState();
}

class _SurveysListViewState extends State<SurveysListView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshSurveys(context);
    });
  }

  Future<void> _refreshSurveys(BuildContext context) async {
    final surveysVm = context.read<SurveysListViewModel>();
    final walletVm = context.maybeRead<WalletViewModel>();
    await Future.wait([
      surveysVm.fetchSurveys(),
      if (walletVm != null) walletVm.fetchWalletData(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<SurveysListViewModel>();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: const EcoBinAppBar(),
      body: RefreshIndicator(
        onRefresh: () => _refreshSurveys(context),
        color: AppColors.primaryGreen,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Screen Header & Pending Points
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Flexible(
                          child: Text(
                            'Surveys List',
                            overflow: TextOverflow.ellipsis,
                            style: AppTypography.headlineCairo.copyWith(
                              fontSize: 24,
                              color: AppColors.deepForest,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.refresh_rounded, color: AppColors.deepForest, size: 22),
                          tooltip: 'Refresh',
                          onPressed: vm.isLoading ? null : () => _refreshSurveys(context),
                        ),
                      ],
                    ),
                  ),
                  RichText(
                  text: TextSpan(
                    text: 'Pending ',
                    style: AppTypography.titlePlex.copyWith(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.darkSlate,
                    ),
                    children: [
                      TextSpan(
                        text: '${vm.pendingPoints} ',
                        style: const TextStyle(color: AppColors.darkSlate),
                      ),
                      const TextSpan(
                        text: 'PTS',
                        style: TextStyle(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Segmented Filter Bar [All | Waiting | Done]
            Container(
              height: 48,
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFFE2E8F0),
                borderRadius: BorderRadius.circular(24),
              ),
              child: Row(
                children: ['All', 'Waiting', 'Done'].map((filter) {
                  final isSelected = vm.activeFilter == filter;
                  return Expanded(
                    child: GestureDetector(
                      onTap: () => vm.setFilter(filter),
                      child: Container(
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.white : Colors.transparent,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: Colors.black.withAlpha(15),
                                    blurRadius: 4,
                                    offset: const Offset(0, 1),
                                  ),
                                ]
                              : null,
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          filter,
                          style: AppTypography.titlePlex.copyWith(
                            fontSize: 15,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected ? AppColors.darkSlate : AppColors.textSecondary,
                          ),
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
            const SizedBox(height: 20),

            // List of Surveys
            if (vm.isLoading)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(40),
                  child: CircularProgressIndicator(color: AppColors.primaryGreen),
                ),
              )
            else
              ...vm.filteredSurveys.map((survey) {
                return Container(
                  margin: const EdgeInsets.only(bottom: 14),
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
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Text(
                                    'Survey#${survey.surveyNumber}',
                                    style: AppTypography.titlePlex.copyWith(
                                      fontSize: 17,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.darkSlate,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Text(
                                    survey.binName,
                                    style: AppTypography.subtitlePlex.copyWith(
                                      color: AppColors.primaryGreen,
                                      fontWeight: FontWeight.w600,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 2),
                              Text(
                                survey.timeAgo,
                                style: AppTypography.bodyMedium.copyWith(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            survey.isWaiting
                                ? '+${survey.points} PTS'
                                : '${survey.points} PTS',
                            style: AppTypography.titlePlex.copyWith(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: survey.isWaiting
                                  ? AppColors.primaryGreen
                                  : AppColors.darkSlate,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Action Button
                      if (survey.isWaiting)
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.deepForest,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                          ),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => VerifySurveyView(surveyId: survey.surveyId),
                              ),
                            );
                          },
                          child: const Text('Start Survey'),
                        )
                      else
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.darkSlate,
                            foregroundColor: Colors.white,
                            minimumSize: const Size(double.infinity, 48),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                          ),
                          icon: const Icon(Icons.check_circle_outline, size: 18),
                          label: const Text('Review'),
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (_) => VerifySurveyView(
                                  surveyId: survey.surveyId,
                                  isReadOnly: true,
                                ),
                              ),
                            );
                          },
                        ),
                    ],
                  ),
                );
              }),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
