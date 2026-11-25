import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../shell/presentation/widgets/ecobin_app_bar.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../viewmodels/marketplace_viewmodel.dart';
import '../widgets/reward_details_sheet.dart';
import '../../../wallet/presentation/views/wallet_view.dart';

class MarketplaceView extends StatefulWidget {
  const MarketplaceView({super.key});

  @override
  State<MarketplaceView> createState() => _MarketplaceViewState();
}

class _MarketplaceViewState extends State<MarketplaceView> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _refreshMarketplace(context);
    });
  }

  Future<void> _refreshMarketplace(BuildContext context) async {
    final marketVm = context.read<MarketplaceViewModel>();
    final walletVm = context.maybeRead<WalletViewModel>();
    await Future.wait([
      marketVm.fetchMarketplaceData(),
      if (walletVm != null) walletVm.fetchWalletData(),
    ]);
    if (walletVm != null) {
      marketVm.syncBalancePoints(walletVm.availablePoints);
    }
  }

  void _openRedemptionSheet(BuildContext context, dynamic item) {
    final marketVm = context.read<MarketplaceViewModel>();
    final walletVm = context.maybeRead<WalletViewModel>();
    if (walletVm != null) {
      marketVm.syncBalancePoints(walletVm.availablePoints);
    }
    marketVm.selectItemForRedemption(item);
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => const RewardDetailsSheet(),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<MarketplaceViewModel>();
    final walletVm = context.maybeWatch<WalletViewModel>();
    final displayPoints = walletVm?.availablePoints ?? vm.balancePoints;
    final displayCashEgp = displayPoints / 100.0;
    final items = vm.items;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: EcoBinAppBar(points: displayPoints),
      body: RefreshIndicator(
        onRefresh: () => _refreshMarketplace(context),
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
                      'EcoBin Marketplace',
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
                    onPressed: vm.isLoading ? null : () => _refreshMarketplace(context),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // Available Balance Card (Deep Green Rounded Card with Asset Texture)
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
                                style: AppTypography.subtitlePlex.copyWith(
                                  color: Colors.white.withAlpha(200),
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              RichText(
                                text: TextSpan(
                                  text: '$displayPoints ',
                                  style: AppTypography.headlineCairo.copyWith(
                                    fontSize: 30,
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
                              'E£ ${displayCashEgp.toStringAsFixed(2)}',
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

                    // Wallet button pill
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
                        icon: const Icon(Icons.account_balance_wallet_outlined, size: 16),
                        label: const Text('Wallet', style: TextStyle(fontSize: 13)),
                        onPressed: () async {
                          await Navigator.of(context).push(
                            MaterialPageRoute(builder: (_) => const WalletView()),
                          );
                          if (context.mounted) {
                            await _refreshMarketplace(context);
                          }
                        },
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),

              // Featured Spotlight
              Text(
                'FEATURED SPOTLIGHT',
                style: AppTypography.badgeText.copyWith(
                  color: AppColors.textSecondary,
                  letterSpacing: 1.1,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 10),

              // Spotlight Banner Card (Pixel-perfect design asset)
              ClipRRect(
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  height: 140,
                  decoration: BoxDecoration(
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha(20),
                        blurRadius: 8,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Image.asset(
                    'assets/images/metro_spotlight.jpg',
                    fit: BoxFit.cover,
                    width: double.infinity,
                    height: 140,
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // Available Rewards Grid
              Text(
                'AVAILABLE REWARDS',
                style: AppTypography.badgeText.copyWith(
                  color: AppColors.textSecondary,
                  letterSpacing: 1.1,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 12),

              // Grid of Reward Cards
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 14,
                  mainAxisSpacing: 14,
                  childAspectRatio: 0.88,
                ),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withAlpha(12),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(20),
                      child: Stack(
                        children: [
                          // Main Card Column (White Logo Area + Deep Forest Bottom)
                          Column(
                            children: [
                              // Brand Logo Area
                              Expanded(
                                child: Container(
                                  width: double.infinity,
                                  color: Colors.white,
                                  padding: const EdgeInsets.fromLTRB(16, 26, 16, 10),
                                  child: Center(
                                    child: item.logoUrl.startsWith('assets/')
                                        ? Image.asset(
                                            item.logoUrl,
                                            fit: BoxFit.contain,
                                            height: 56,
                                          )
                                        : Image.network(
                                            item.logoUrl,
                                            fit: BoxFit.contain,
                                            height: 56,
                                            errorBuilder: (context, error, stackTrace) => const Icon(
                                              Icons.card_giftcard,
                                              size: 40,
                                              color: AppColors.primaryGreen,
                                            ),
                                          ),
                                  ),
                                ),
                              ),

                              // Bottom Deep Forest Section
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                decoration: const BoxDecoration(
                                  color: AppColors.deepForest,
                                  borderRadius: BorderRadius.vertical(
                                    top: Radius.circular(16),
                                  ),
                                ),
                                child: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    // Title
                                    Text(
                                      item.title,
                                      textAlign: TextAlign.center,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: AppTypography.subtitlePlex.copyWith(
                                        fontSize: 11.5,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 6),

                                    // Outlined Redeem Button
                                    InkWell(
                                      onTap: () => _openRedemptionSheet(context, item),
                                      borderRadius: BorderRadius.circular(14),
                                      child: Container(
                                        height: 26,
                                        width: double.infinity,
                                        decoration: BoxDecoration(
                                          borderRadius: BorderRadius.circular(14),
                                          border: Border.all(
                                            color: AppColors.primaryGreen,
                                            width: 1.2,
                                          ),
                                        ),
                                        alignment: Alignment.center,
                                        child: Text(
                                          'Redeem',
                                          style: AppTypography.buttonText.copyWith(
                                            fontSize: 11.5,
                                            fontWeight: FontWeight.w600,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          // Top-Right Docked Points Badge (Pixel-Perfect to PDF)
                          Positioned(
                            top: 0,
                            right: 0,
                            child: Container(
                              padding: const EdgeInsets.fromLTRB(10, 4, 12, 4),
                              decoration: const BoxDecoration(
                                color: AppColors.deepForest,
                                borderRadius: BorderRadius.only(
                                  bottomLeft: Radius.circular(16),
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '${item.defaultPointsCost}',
                                    style: AppTypography.badgeText.copyWith(
                                      color: Colors.white,
                                      fontSize: 13.5,
                                      fontWeight: FontWeight.w800,
                                      height: 1.1,
                                    ),
                                  ),
                                  const SizedBox(width: 1),
                                  Padding(
                                    padding: const EdgeInsets.only(top: 1.0),
                                    child: Text(
                                      'PTS',
                                      style: AppTypography.badgeText.copyWith(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                        height: 1.1,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
