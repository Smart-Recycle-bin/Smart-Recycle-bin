import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../viewmodels/marketplace_viewmodel.dart';

class RewardDetailsSheet extends StatelessWidget {
  const RewardDetailsSheet({super.key});

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<MarketplaceViewModel>();
    final item = vm.selectedItem;
    if (item == null) return const SizedBox.shrink();

    final selectedDenom = vm.selectedDenomination;

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

          // Selectable Denominations Chips
          Row(
            children: item.denominations.map((denom) {
              final isSelected = selectedDenom?.valueEgp == denom.valueEgp;
              return Padding(
                padding: const EdgeInsets.only(right: 12.0),
                child: GestureDetector(
                  onTap: () => vm.selectDenomination(denom),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFE6F4EA) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? AppColors.deepForest : AppColors.inputBorder,
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Text(
                      'E£ ${denom.valueEgp}',
                      style: AppTypography.titlePlex.copyWith(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isSelected ? AppColors.deepForest : AppColors.darkSlate,
                      ),
                    ),
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
                      '${vm.balancePoints} pts',
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
          const SizedBox(height: 18),

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
                    final code = await vm.redeemSelected();
                    if (context.mounted && code != null) {
                      Navigator.of(context).pop();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Voucher claimed! Code: $code'),
                          backgroundColor: AppColors.primaryGreen,
                        ),
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
              'Balance after redemption: ${vm.balanceAfterRedemption} pts',
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
}
