import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/auth_scaffold_background.dart';
import '../viewmodels/auth_viewmodel.dart';
import 'verify_email_view.dart';

class ForgotPasswordView extends StatefulWidget {
  const ForgotPasswordView({super.key});

  @override
  State<ForgotPasswordView> createState() => _ForgotPasswordViewState();
}

class _ForgotPasswordViewState extends State<ForgotPasswordView> {
  final _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _handleSendOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your email address')),
      );
      return;
    }

    final vm = context.read<AuthViewModel>();
    final success = await vm.sendPasswordResetOtp(email);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password reset OTP sent to your email!'),
            backgroundColor: AppColors.primaryGreen,
          ),
        );
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => VerifyEmailView(email: email),
          ),
        );
      } else if (vm.errorMessage != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(vm.errorMessage!),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();

    return AuthScaffoldBackground(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28.0, vertical: 20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 60),
              RichText(
                text: TextSpan(
                  text: 'Welcome\nBack to ',
                  style: AppTypography.headlineCairo.copyWith(
                    fontSize: 32,
                    fontWeight: FontWeight.w800,
                    color: AppColors.deepForest,
                    height: 1.2,
                  ),
                  children: const [
                    TextSpan(
                      text: 'EcoBin',
                      style: TextStyle(
                        color: AppColors.primaryGreen,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 40),

              Text(
                'Forget Password',
                style: AppTypography.titlePlex.copyWith(
                  fontSize: 26,
                  color: AppColors.deepForest,
                ),
              ),
              const SizedBox(height: 24),

              Text(
                'Email',
                style: AppTypography.subtitlePlex.copyWith(
                  color: AppColors.darkSlate,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  hintText: 'Enter your registered email',
                ),
              ),

              // I Remember My Password link
              Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(
                    'I Remember My Password',
                    style: AppTypography.subtitlePlex.copyWith(
                      color: AppColors.darkSlate,
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Send OTP button
              ElevatedButton(
                onPressed: authVm.isLoading ? null : _handleSendOtp,
                child: authVm.isLoading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Send OTP'),
              ),
              const SizedBox(height: 60),
            ],
          ),
        ),
      ),
    );
  }
}
