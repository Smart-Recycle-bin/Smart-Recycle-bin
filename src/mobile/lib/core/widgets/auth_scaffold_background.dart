import 'package:flutter/material.dart';

/// Pixel-perfect decorative background matching Screens 2, 3, 4, 5 in EcoBinUI.pdf
class AuthScaffoldBackground extends StatelessWidget {
  final Widget child;

  const AuthScaffoldBackground({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Stack(
        fit: StackFit.expand,
        children: [
          // Exact asset from design
          Image.asset(
            'assets/images/auth_bg.png',
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
          ),

          // Actual Content
          SafeArea(child: child),
        ],
      ),
    );
  }
}
