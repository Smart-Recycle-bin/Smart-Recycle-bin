import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../viewmodels/marketplace_viewmodel.dart';

class RewardDetailsSheet extends StatelessWidget {
  const RewardDetailsSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<MarketplaceViewModel>();
    final walletVm = context.maybeWatch<WalletViewModel>();
    final item = vm.selectedItem;
    if (item == null) return const SizedBox.shrink();

    final selectedDenom = vm.selectedDenomination;
    final currentBalance = walletVm?.availablePoints ?? vm.balancePoints;
    final balanceAfter = selectedDenom == null
        ? currentBalance
        : currentBalance - selectedDenom.pointsCost;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(28),
          topRight: Radius.circular(28),
        ),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Row with Title & Close (X)
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Reward details',
                  style: AppTypography.titlePlex.copyWith(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppColors.darkSlate,
                  ),
                ),
                GestureDetector(
                  onTap: () => Navigator.of(context).pop(),
                  child: Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF1F5F9),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, size: 20, color: AppColors.darkSlate),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Brand Logo (3x larger, pixel-perfect to Page 10 of PDF)
            Center(
              child: SizedBox(
                height: 165,
                child: item.logoUrl.startsWith('assets/')
                    ? Image.asset(item.logoUrl, fit: BoxFit.contain)
                    : Image.network(
                        item.logoUrl,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) => const Icon(
                          Icons.card_giftcard,
                          size: 80,
                          color: AppColors.primaryGreen,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 14),

          // Title & Description
          Text(
            item.title,
            style: AppTypography.headlineCairo.copyWith(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppColors.deepForest,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            item.description,
            style: AppTypography.bodyPlex.copyWith(
              fontSize: 14,
              color: AppColors.textSecondary,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 20),

          // Choose voucher value
          Text(
            'Choose voucher value',
            style: AppTypography.titlePlex.copyWith(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.darkSlate,
            ),
          ),
          const SizedBox(height: 10),

          // Selectable Option / Denomination Chips
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: item.denominations.map((denom) {
              final isSelected = selectedDenom != null &&
                  ((selectedDenom.itemId != null && denom.itemId != null)
                      ? selectedDenom.itemId == denom.itemId
                      : selectedDenom.valueEgp == denom.valueEgp &&
                          selectedDenom.pointsCost == denom.pointsCost);
              final label = denom.label ?? 'E£ ${denom.valueEgp}';
              return GestureDetector(
                onTap: denom.inStock ? () => vm.selectDenomination(denom) : null,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                  decoration: BoxDecoration(
                    color: !denom.inStock
                        ? Colors.grey.shade100
                        : (isSelected ? const Color(0xFFE6F4EA) : Colors.white),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: !denom.inStock
                          ? Colors.grey.shade300
                          : (isSelected ? AppColors.deepForest : AppColors.inputBorder),
                      width: isSelected ? 2 : 1,
                    ),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        label,
                        style: AppTypography.titlePlex.copyWith(
                          fontSize: 14.5,
                          fontWeight: FontWeight.bold,
                          color: !denom.inStock
                              ? AppColors.textMuted
                              : (isSelected ? AppColors.deepForest : AppColors.darkSlate),
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        denom.inStock ? '${denom.pointsCost} pts' : 'Out of stock',
                        style: AppTypography.bodyPlex.copyWith(
                          fontSize: 12,
                          color: !denom.inStock ? AppColors.textMuted : AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 20),

          // Cost Calculation Box
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Reward cost',
                      style: AppTypography.bodyPlex.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '${selectedDenom?.pointsCost ?? item.defaultPointsCost} pts',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForest,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Your balance',
                      style: AppTypography.bodyPlex.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                    Text(
                      '$currentBalance pts',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: AppColors.darkSlate,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),

          if (vm.errorMessage != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              margin: const EdgeInsets.only(bottom: 12),
              decoration: BoxDecoration(
                color: AppColors.danger.withAlpha(20),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: AppColors.danger.withAlpha(90)),
              ),
              child: Text(
                vm.errorMessage!,
                style: AppTypography.bodyPlex.copyWith(
                  color: AppColors.danger,
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],

          // Redeem Button
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForest,
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 52),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(26),
              ),
            ),
            onPressed: vm.isLoading
                ? null
                : () async {
                    final readWalletVm = context.maybeRead<WalletViewModel>();
                    if (readWalletVm != null) {
                      vm.syncBalancePoints(readWalletVm.availablePoints);
                    }
                    final code = await vm.redeemSelected();
                    if (!context.mounted) return;
                    if (code != null) {
                      if (readWalletVm != null) {
                        await readWalletVm.fetchWalletData();
                        vm.syncBalancePoints(readWalletVm.availablePoints);
                      }
                      if (!context.mounted) return;
                      Navigator.of(context).pop();
                      _showRedemptionSuccessDialog(
                        context,
                        code: code,
                        item: item,
                        selectedLabel: selectedDenom?.label,
                        denominationEgp: selectedDenom?.valueEgp ?? 10,
                        pointsCost: selectedDenom?.pointsCost ?? item.defaultPointsCost,
                      );
                    }
                  },
            child: vm.isLoading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Text('Redeem'),
          ),
          const SizedBox(height: 8),

          // Subtitle
          Center(
            child: Text(
              'Balance after redemption: $balanceAfter pts',
              style: AppTypography.subtitlePlex.copyWith(
                fontSize: 13,
                color: AppColors.textSecondary,
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],
      ),
      ),
    );
  }

  void _showRedemptionSuccessDialog(
    BuildContext context, {
    required String code,
    required dynamic item,
    String? selectedLabel,
    required int denominationEgp,
    required int pointsCost,
  }) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => Dialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(28),
        ),
        elevation: 10,
        backgroundColor: Colors.white,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 26),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Celebration Icon
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4EA),
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.mintGreen, width: 2),
                ),
                child: const Center(
                  child: Icon(
                    Icons.check_circle_rounded,
                    color: AppColors.primaryGreen,
                    size: 44,
                  ),
                ),
              ),
              const SizedBox(height: 18),

              // Title
              Text(
                'Voucher Claimed!',
                textAlign: TextAlign.center,
                style: AppTypography.headlineCairo.copyWith(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepForest,
                ),
              ),
              const SizedBox(height: 6),

              // Subtitle
              Text(
                'You have successfully redeemed ${item.title}.',
                textAlign: TextAlign.center,
                style: AppTypography.bodyPlex.copyWith(
                  fontSize: 13.5,
                  color: AppColors.textSecondary,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 20),

              // Voucher Code Container
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                decoration: BoxDecoration(
                  color: const Color(0xFFF8FAFC),
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.inputBorder, width: 1.2),
                ),
                child: Column(
                  children: [
                    Text(
                      'YOUR VOUCHER CODE',
                      style: AppTypography.badgeText.copyWith(
                        color: AppColors.textSecondary,
                        letterSpacing: 1.2,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    SelectableText(
                      code,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 2,
                        color: AppColors.deepForest,
                      ),
                    ),
                    const SizedBox(height: 10),
                    InkWell(
                      borderRadius: BorderRadius.circular(12),
                      onTap: () async {
                        await Clipboard.setData(ClipboardData(text: code));
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Voucher code copied to clipboard!'),
                              backgroundColor: AppColors.primaryGreen,
                              duration: Duration(seconds: 2),
                            ),
                          );
                        }
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE6F4EA),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.copy_rounded,
                              size: 16,
                              color: AppColors.deepForest,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              'Copy Code',
                              style: AppTypography.subtitlePlex.copyWith(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.deepForest,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Summary details
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    selectedLabel != null ? 'Reward' : 'Voucher Value',
                    style: AppTypography.bodyPlex.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      selectedLabel ?? 'E£ $denominationEgp',
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: AppColors.darkSlate,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Points Deducted',
                    style: AppTypography.bodyPlex.copyWith(
                      color: AppColors.textSecondary,
                      fontSize: 13,
                    ),
                  ),
                  Text(
                    '- $pointsCost pts',
                    style: AppTypography.titlePlex.copyWith(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.danger,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Done Button
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.deepForest,
                  foregroundColor: Colors.white,
                  minimumSize: const Size(double.infinity, 50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(25),
                  ),
                  elevation: 0,
                ),
                onPressed: () => Navigator.of(dialogContext).pop(),
                child: Text(
                  'Done',
                  style: AppTypography.buttonText.copyWith(fontSize: 16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
