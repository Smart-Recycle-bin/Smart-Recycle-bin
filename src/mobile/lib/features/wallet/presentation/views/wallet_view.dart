import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../shell/presentation/widgets/ecobin_app_bar.dart';
import '../viewmodels/wallet_viewmodel.dart';
import '../../../marketplace/presentation/viewmodels/marketplace_viewmodel.dart';
import '../../../marketplace/presentation/views/marketplace_view.dart';

class WalletView extends StatefulWidget {
  const WalletView({super.key});

  @override
  State<WalletView> createState() => _WalletViewState();
}

class _WalletViewState extends State<WalletView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshWallet(context);
    });
  }

  Future<void> _refreshWallet(BuildContext context) async {
    final vm = context.read<WalletViewModel>();
    await vm.fetchWalletData();
    if (context.mounted) {
      context.maybeRead<MarketplaceViewModel>()?.syncBalancePoints(vm.availablePoints);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<WalletViewModel>();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: EcoBinAppBar(points: vm.availablePoints),
      body: RefreshIndicator(
        onRefresh: () => _refreshWallet(context),
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
                      'EcoPoints Wallet',
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
                    onPressed: vm.isLoading ? null : () => _refreshWallet(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Available Balance Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24),
                  image: const DecorationImage(
                    image: AssetImage('assets/images/balance_card_bg.jpg'),
                    fit: BoxFit.cover,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.deepForest.withAlpha(50),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Available Balance',
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.subtitlePlex.copyWith(
                                  color: Colors.white.withAlpha(200),
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              RichText(
                                text: TextSpan(
                                  text: '${vm.availablePoints} ',
                                  style: AppTypography.headlineCairo.copyWith(
                                    fontSize: 32,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                  children: [
                                    TextSpan(
                                      text: 'PTS',
                                      style: AppTypography.badgeText.copyWith(
                                        color: AppColors.mintGreen,
                                        fontSize: 14,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              'Cash Value',
                              style: AppTypography.subtitlePlex.copyWith(
                                color: Colors.white.withAlpha(200),
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'E£ ${vm.cashValueEgp.toStringAsFixed(2)}',
                              style: AppTypography.titlePlex.copyWith(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Redeem Button pill
                    Align(
                      alignment: Alignment.centerRight,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.white,
                          side: const BorderSide(color: Colors.white, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                          minimumSize: const Size(120, 38),
                          padding: const EdgeInsets.symmetric(horizontal: 14),
                        ),
                        icon: const Icon(Icons.card_giftcard, size: 16),
                        label: const Text('Redeem', style: TextStyle(fontSize: 13)),
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const MarketplaceView()),
                          );
                          if (context.mounted) {
                            await _refreshWallet(context);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Recent Activity Section
              Text(
                'Recent Activity',
                style: AppTypography.titlePlex.copyWith(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: AppColors.darkSlate,
                ),
              ),
              const SizedBox(height: 12),

              // Filter Tabs [All | Earned | Spent]
              Container(
                height: 46,
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE2E8F0),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Row(
                  children: ['All', 'Earned', 'Spent'].map((filter) {
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
                              fontSize: 14,
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
              const SizedBox(height: 16),

              // Ledger Transactions List
              if (vm.isLoading && vm.entries.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(color: AppColors.primaryGreen),
                  ),
                )
              else if (vm.errorMessage != null && vm.entries.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: AppColors.danger.withAlpha(80)),
                  ),
                  child: Column(
                    children: [
                      Text(
                        vm.errorMessage!,
                        textAlign: TextAlign.center,
                        style: AppTypography.bodyPlex.copyWith(
                          color: AppColors.danger,
                          fontSize: 13,
                        ),
                      ),
                      const SizedBox(height: 10),
                      TextButton.icon(
                        onPressed: () => _refreshWallet(context),
                        icon: const Icon(Icons.refresh_rounded),
                        label: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              else if (vm.filteredEntries.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 28, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: Text(
                    vm.activeFilter == 'All'
                        ? 'No transactions yet.'
                        : 'No ${vm.activeFilter.toLowerCase()} transactions yet.',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyPlex.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                )
              else
                ...vm.filteredEntries.map((entry) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(5),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        // Circular Icon
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: entry.isCredit
                                ? AppColors.primaryGreen.withAlpha(30)
                                : AppColors.mintGreen.withAlpha(40),
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            entry.isCredit ? Icons.recycling_rounded : Icons.card_giftcard,
                            color: entry.isCredit ? AppColors.deepForest : AppColors.primaryGreen,
                            size: 22,
                          ),
                        ),
                        const SizedBox(width: 14),

                        // Title & Date
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                entry.title,
                                style: AppTypography.titlePlex.copyWith(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.darkSlate,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                entry.balanceAfter != null
                                    ? '${entry.timeFormatted} • Bal: ${entry.balanceAfter} PTS'
                                    : entry.timeFormatted,
                                style: AppTypography.bodyMedium.copyWith(
                                  fontSize: 12,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Points Delta
                        Text(
                          entry.pointsFormatted,
                          style: AppTypography.titlePlex.copyWith(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: entry.isCredit
                                ? AppColors.primaryGreen
                                : AppColors.darkSlate,
                          ),
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
