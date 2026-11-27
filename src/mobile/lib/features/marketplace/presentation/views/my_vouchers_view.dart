import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../domain/entities/redeemed_voucher_entity.dart';
import '../viewmodels/marketplace_viewmodel.dart';

class MyVouchersView extends StatefulWidget {
  const MyVouchersView({super.key});

  @override
  State<MyVouchersView> createState() => _MyVouchersViewState();
}

class _MyVouchersViewState extends State<MyVouchersView> {
  static const List<({String id, String label})> _filters = [
    (id: 'all', label: 'All'),
    (id: 'unused', label: 'Unused'),
    (id: 'used', label: 'Used'),
    (id: 'expired', label: 'Expired'),
  ];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MarketplaceViewModel>().fetchMyVouchers();
    });
  }

  ({Color bg, Color fg, String label}) _statusStyle(String status) {
    switch (status.toLowerCase()) {
      case 'used':
        return (
          bg: const Color(0xFFF1F5F9),
          fg: AppColors.textSecondary,
          label: 'USED',
        );
      case 'expired':
        return (
          bg: const Color(0xFFFEE2E2),
          fg: AppColors.danger,
          label: 'EXPIRED',
        );
      default:
        return (
          bg: const Color(0xFFE6F4EA),
          fg: AppColors.primaryGreen,
          label: 'UNUSED',
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<MarketplaceViewModel>();
    final vouchers = vm.myVouchers;

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: Text('My Vouchers', style: AppTypography.titlePlex),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.deepForest),
            tooltip: 'Refresh',
            onPressed: vm.isLoadingVouchers ? null : () => vm.fetchMyVouchers(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Status filter chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
            child: Row(
              children: _filters.map((f) {
                final selected = vm.voucherStatusFilter == f.id;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text(f.label),
                    selected: selected,
                    selectedColor: AppColors.deepForest,
                    backgroundColor: Colors.white,
                    labelStyle: AppTypography.subtitlePlex.copyWith(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: selected ? Colors.white : AppColors.darkSlate,
                    ),
                    onSelected: vm.isLoadingVouchers
                        ? null
                        : (_) => vm.setVoucherFilter(f.id),
                  ),
                );
              }).toList(),
            ),
          ),

          Expanded(
            child: RefreshIndicator(
              onRefresh: () => vm.fetchMyVouchers(),
              color: AppColors.primaryGreen,
              child: _buildBody(context, vm, vouchers),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBody(
    BuildContext context,
    MarketplaceViewModel vm,
    List<RedeemedVoucherEntity> vouchers,
  ) {
    if (vm.isLoadingVouchers && vouchers.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primaryGreen),
      );
    }

    if (vm.vouchersErrorMessage != null && vouchers.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Column(
              children: [
                const Icon(Icons.error_outline, color: AppColors.danger, size: 42),
                const SizedBox(height: 12),
                Text(
                  vm.vouchersErrorMessage!,
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyPlex.copyWith(color: AppColors.darkSlate),
                ),
                const SizedBox(height: 14),
                ElevatedButton(
                  onPressed: () => vm.fetchMyVouchers(),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ],
      );
    }

    if (vouchers.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(24),
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 32),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withAlpha(5),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Column(
              children: [
                Container(
                  width: 64,
                  height: 64,
                  decoration: const BoxDecoration(
                    color: Color(0xFFE6F4EA),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.confirmation_number_outlined,
                    size: 32,
                    color: AppColors.primaryGreen,
                  ),
                ),
                const SizedBox(height: 14),
                Text(
                  'No redeemed vouchers yet',
                  style: AppTypography.titlePlex.copyWith(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepForest,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'When you redeem points for rewards in the Marketplace, your voucher codes will appear here.',
                  textAlign: TextAlign.center,
                  style: AppTypography.bodyPlex.copyWith(
                    fontSize: 13.5,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 32),
      itemCount: vouchers.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, index) => _buildVoucherCard(context, vouchers[index]),
    );
  }

  Widget _buildVoucherCard(BuildContext context, RedeemedVoucherEntity voucher) {
    final badge = _statusStyle(voucher.status);
    final formattedDate = DateFormat('MMM d, y • h:mm a').format(voucher.redeemedAt.toLocal());
    final egpText = voucher.valueEgpAtRedemption == voucher.valueEgpAtRedemption.roundToDouble()
        ? voucher.valueEgpAtRedemption.toInt().toString()
        : voucher.valueEgpAtRedemption.toStringAsFixed(2);

    return Container(
      padding: const EdgeInsets.all(16),
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
          // Title & status badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  voucher.itemTitle,
                  style: AppTypography.titlePlex.copyWith(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppColors.deepForest,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badge.bg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badge.label,
                  style: AppTypography.badgeText.copyWith(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: badge.fg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Voucher Code + Copy button
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.inputBorder),
            ),
            child: Row(
              children: [
                Expanded(
                  child: SelectableText(
                    voucher.voucherCode,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 1.5,
                      color: AppColors.deepForest,
                    ),
                  ),
                ),
                InkWell(
                  borderRadius: BorderRadius.circular(10),
                  onTap: () async {
                    await Clipboard.setData(ClipboardData(text: voucher.voucherCode));
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Voucher code copied!'),
                          backgroundColor: AppColors.primaryGreen,
                          duration: Duration(seconds: 2),
                        ),
                      );
                    }
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6F4EA),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.copy_rounded, size: 15, color: AppColors.deepForest),
                        const SizedBox(width: 4),
                        Text(
                          'Copy',
                          style: AppTypography.badgeText.copyWith(
                            fontSize: 12,
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
          const SizedBox(height: 10),

          // Metadata: Value, Points, Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'E£ $egpText • -${voucher.pointsSpent} pts',
                style: AppTypography.bodyMedium.copyWith(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppColors.darkSlate,
                ),
              ),
              Flexible(
                child: Text(
                  formattedDate,
                  overflow: TextOverflow.ellipsis,
                  style: AppTypography.bodyPlex.copyWith(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
