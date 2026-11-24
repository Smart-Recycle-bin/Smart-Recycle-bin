import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_typography.dart';
import '../../../../core/widgets/auth_scaffold_background.dart';
import '../viewmodels/auth_viewmodel.dart';
import 'verify_email_view.dart';

class RegisterView extends StatefulWidget {
  const RegisterView({super.key});

  @override
  State<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<RegisterView> {
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _rePasswordController = TextEditingController();

  @override
  void dispose() {
    _fullNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _rePasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    final name = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final rePassword = _rePasswordController.text.trim();

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all required fields')),
      );
      return;
    }

    if (password != rePassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Passwords do not match')),
      );
      return;
    }

    final vm = context.read<AuthViewModel>();
    final success = await vm.register(name, email, password);

    if (mounted) {
      if (success) {
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
              const SizedBox(height: 30),
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
              const SizedBox(height: 24),

              Text(
                'Register',
                style: AppTypography.titlePlex.copyWith(
                  fontSize: 26,
                  color: AppColors.deepForest,
                ),
              ),
              const SizedBox(height: 18),

              // Full Name
              Text(
                'Full Name',
                style: AppTypography.subtitlePlex.copyWith(
                  color: AppColors.darkSlate,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  hintText: 'Enter your full name',
                ),
              ),
              const SizedBox(height: 14),

              // Email
              Text(
                'Email',
                style: AppTypography.subtitlePlex.copyWith(
                  color: AppColors.darkSlate,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(
                  hintText: 'Enter your email address',
                ),
              ),
              const SizedBox(height: 14),

              // Password
              Text(
                'Password',
                style: AppTypography.subtitlePlex.copyWith(
                  color: AppColors.darkSlate,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _passwordController,
                obscureText: true,
                decoration: const InputDecoration(
                  hintText: 'Create a password',
                ),
              ),
              const SizedBox(height: 14),

              // Re-Enter Password
              Text(
                'Re-Enter Password',
                style: AppTypography.subtitlePlex.copyWith(
                  color: AppColors.darkSlate,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 6),
              TextField(
                controller: _rePasswordController,
                obscureText: true,
                decoration: const InputDecoration(
                  hintText: 'Re-enter your password',
                ),
              ),
              const SizedBox(height: 24),

              // Sign up button
              ElevatedButton(
                onPressed: authVm.isLoading ? null : _handleRegister,
                child: authVm.isLoading
                    ? const SizedBox(
                        height: 22,
                        width: 22,
                        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                      )
                    : const Text('Sign up'),
              ),
              const SizedBox(height: 14),

              // Sign in button (back to login)
              OutlinedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                },
                child: const Text('Sign in'),
              ),
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}
