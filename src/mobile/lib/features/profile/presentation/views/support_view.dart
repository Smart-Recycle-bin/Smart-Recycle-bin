import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../domain/entities/support_ticket_entity.dart';
import '../viewmodels/profile_viewmodel.dart';

class SupportView extends StatefulWidget {
  final String? sessionId;

  const SupportView({super.key, this.sessionId});

  @override
  State<SupportView> createState() => _SupportViewState();
}

class _SupportViewState extends State<SupportView> {
  static const List<({String id, String label})> _categories = [
    (id: 'general_inquiry', label: 'General'),
    (id: 'bin_issue', label: 'Bin Issue'),
    (id: 'points_issue', label: 'Points'),
    (id: 'voucher_issue', label: 'Vouchers'),
  ];

  final _descriptionController = TextEditingController();
  late String _selectedCategory;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.sessionId != null ? 'bin_issue' : 'general_inquiry';
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProfileViewModel>().fetchSupportTickets();
    });
  }

  @override
  void dispose() {
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final text = _descriptionController.text.trim();
    if (text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please describe the issue')),
      );
      return;
    }

    final vm = context.read<ProfileViewModel>();
    final ticket = await vm.submitSupportTicket(
      text,
      category: _selectedCategory,
      sessionId: widget.sessionId,
    );

    if (!mounted) return;
    if (ticket != null) {
      _descriptionController.clear();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Support ticket ${ticket.ticketId} received!'),
          backgroundColor: AppColors.primaryGreen,
        ),
      );
    } else if (vm.supportErrorMessage != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(vm.supportErrorMessage!),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  String _formatCategoryLabel(String category) {
    for (final c in _categories) {
      if (c.id == category) return c.label;
    }
    return category.replaceAll('_', ' ');
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ProfileViewModel>();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: Text('Customer Support', style: AppTypography.titlePlex),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: AppColors.deepForest),
            tooltip: 'Refresh tickets',
            onPressed: vm.isLoadingTickets ? null : () => vm.fetchSupportTickets(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => vm.fetchSupportTickets(),
        color: AppColors.primaryGreen,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'How can we help you?',
                style: AppTypography.titlePlex.copyWith(
                  fontSize: 20,
                  color: AppColors.deepForest,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                widget.sessionId != null
                    ? 'Reporting issue regarding active session ${widget.sessionId}'
                    : 'Let us know if you encountered any smart bin issues or need assistance.',
                style: AppTypography.subtitlePlex,
              ),
              const SizedBox(height: 18),

              Text(
                'Category',
                style: AppTypography.subtitlePlex.copyWith(
                  fontWeight: FontWeight.bold,
                  color: AppColors.darkSlate,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: _categories.map((cat) {
                  final selected = _selectedCategory == cat.id;
                  return ChoiceChip(
                    label: Text(cat.label),
                    selected: selected,
                    selectedColor: const Color(0xFFE6F4EA),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: selected ? AppColors.deepForest : AppColors.inputBorder,
                    ),
                    labelStyle: AppTypography.subtitlePlex.copyWith(
                      color: selected ? AppColors.deepForest : AppColors.darkSlate,
                      fontWeight: selected ? FontWeight.bold : FontWeight.w500,
                    ),
                    onSelected: (_) => setState(() => _selectedCategory = cat.id),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              TextField(
                controller: _descriptionController,
                maxLines: 5,
                decoration: InputDecoration(
                  hintText: 'Type your message or issue description here...',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(16),
                    borderSide: const BorderSide(color: AppColors.inputBorder),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              ElevatedButton(
                onPressed: vm.isLoading ? null : _handleSubmit,
                child: vm.isLoading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Submit Ticket'),
              ),

              const SizedBox(height: 28),
              Text(
                'MY SUPPORT TICKETS',
                style: AppTypography.badgeText.copyWith(
                  color: AppColors.textSecondary,
                  letterSpacing: 1.1,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 10),

              if (vm.isLoadingTickets && vm.tickets.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(24),
                    child: CircularProgressIndicator(color: AppColors.primaryGreen),
                  ),
                )
              else if (vm.tickets.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Text(
                    'No support tickets submitted yet.',
                    textAlign: TextAlign.center,
                    style: AppTypography.bodyPlex.copyWith(color: AppColors.textSecondary),
                  ),
                )
              else
                ...vm.tickets.map((t) => _TicketCard(
                      ticket: t,
                      categoryLabel: _formatCategoryLabel(t.category),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}

class _TicketCard extends StatelessWidget {
  final SupportTicketEntity ticket;
  final String categoryLabel;

  const _TicketCard({required this.ticket, required this.categoryLabel});

  @override
  Widget build(BuildContext context) {
    final dateStr = DateFormat('MMM dd, h:mm a').format(ticket.createdAt.toLocal());

    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
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
                ticket.ticketId,
                style: AppTypography.titlePlex.copyWith(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: AppColors.deepForest,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFE6F4EA),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  ticket.status.toUpperCase(),
                  style: AppTypography.badgeText.copyWith(
                    color: AppColors.deepForest,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            ticket.description,
            style: AppTypography.bodyPlex.copyWith(color: AppColors.darkSlate, fontSize: 13.5),
          ),
          const SizedBox(height: 8),
          Text(
            '$categoryLabel • $dateStr',
            style: AppTypography.bodyMedium.copyWith(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
