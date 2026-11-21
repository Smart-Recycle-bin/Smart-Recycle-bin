import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../viewmodels/profile_viewmodel.dart';

class SupportView extends StatefulWidget {
  final String? sessionId;

  const SupportView({super.key, this.sessionId});

  @override
  State<SupportView> createState() => _SupportViewState();
}

class _SupportViewState extends State<SupportView> {
  final _descriptionController = TextEditingController();

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
    final success = await vm.submitSupportTicket(text, sessionId: widget.sessionId);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Support ticket received! We will assist you shortly.'),
            backgroundColor: AppColors.primaryGreen,
          ),
        );
        Navigator.of(context).pop();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ProfileViewModel>();

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      appBar: AppBar(
        title: Text('Customer Support', style: AppTypography.titlePlex),
      ),
      body: SingleChildScrollView(
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
            const SizedBox(height: 20),

            TextField(
              controller: _descriptionController,
              maxLines: 6,
              decoration: InputDecoration(
                hintText: 'Type your message or issue description here...',
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: const BorderSide(color: AppColors.inputBorder),
                ),
              ),
            ),
            const SizedBox(height: 24),

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
          ],
        ),
      ),
    );
  }
}
