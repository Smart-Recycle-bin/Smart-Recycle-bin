import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:ecobin/core/constants/app_colors.dart';
import 'package:ecobin/core/constants/app_typography.dart';
import '../viewmodels/active_session_viewmodel.dart';
import 'active_session_view.dart';

class ScanBinView extends StatefulWidget {
  final String initialBinId;

  const ScanBinView({super.key, this.initialBinId = 'bin-210'});

  @override
  State<ScanBinView> createState() => _ScanBinViewState();
}

class _ScanBinViewState extends State<ScanBinView>
    with SingleTickerProviderStateMixin {
  late final MobileScannerController _scannerController;
  late final AnimationController _animationController;
  late final Animation<double> _scanLineAnimation;

  bool _isProcessing = false;
  bool _hasScanned = false;

  @override
  void initState() {
    super.initState();

    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2200),
    )..repeat(reverse: true);

    _scanLineAnimation = Tween<double>(begin: 12.0, end: 248.0).animate(
      CurvedAnimation(
        parent: _animationController,
        curve: Curves.easeInOut,
      ),
    );
  }

  @override
  void dispose() {
    _animationController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  /// Process scanned QR code or manual simulation
  Future<void> _processScannedPayload(String rawPayload) async {
    if (_isProcessing || _hasScanned) return;

    setState(() {
      _isProcessing = true;
      _hasScanned = true;
    });

    // Parse binId from payload (e.g., "bin-210:dyn-8f2c91a0" or "bin-210" or url)
    String binId = widget.initialBinId;
    if (rawPayload.contains(':')) {
      final parts = rawPayload.split(':');
      if (parts.isNotEmpty && parts.first.trim().isNotEmpty) {
        binId = parts.first.trim();
      }
    } else if (rawPayload.startsWith('bin-') || rawPayload.startsWith('BIN-')) {
      binId = rawPayload.trim();
    }

    final vm = context.read<ActiveSessionViewModel>();
    final success = await vm.startSession(
      binId,
      rawPayload,
    );

    if (mounted) {
      setState(() => _isProcessing = false);
      if (success) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const ActiveSessionView()),
        );
      } else {
        _hasScanned = false;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(vm.errorMessage ?? 'Failed to start session on bin $binId'),
            backgroundColor: AppColors.danger,
          ),
        );
      }
    }
  }

  /// Manual button fallback
  Future<void> _triggerManualScan() async {
    final payload = '${widget.initialBinId}:dyn-8f2c91a0';
    await _processScannedPayload(payload);
  }

  @override
  Widget build(BuildContext context) {
    const double frameSize = 260.0;

    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // ── Real Live Camera Scanner ──
          Positioned.fill(
            child: MobileScanner(
              controller: _scannerController,
              onDetect: (BarcodeCapture capture) {
                if (_isProcessing || _hasScanned) return;
                for (final barcode in capture.barcodes) {
                  final raw = barcode.rawValue;
                  if (raw != null && raw.isNotEmpty) {
                    _processScannedPayload(raw);
                    break;
                  }
                }
              },
              errorBuilder: (context, error) {
                // Fallback for emulator / devices without camera or denied permission
                return Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.network(
                      'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800',
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) => Container(color: Colors.black),
                    ),
                    Container(color: Colors.black.withAlpha(140)),
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 32),
                        child: Text(
                          'Camera unavailable in emulator.\nTap "Scan Bin" below to simulate scan.',
                          textAlign: TextAlign.center,
                          style: AppTypography.bodyPlex.copyWith(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
          ),

          // ── Dark Vignette Overlay around scanning area ──
          Positioned.fill(
            child: Container(
              color: Colors.black.withAlpha(60),
            ),
          ),

          // ── Top Controls (Torch & Flip) ──
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white, size: 26),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                  Row(
                    children: [
                      // Torch toggle
                      IconButton(
                        icon: const Icon(Icons.flash_on_rounded, color: Colors.white, size: 24),
                        onPressed: () => _scannerController.toggleTorch(),
                      ),
                      // Camera flip
                      IconButton(
                        icon: const Icon(Icons.flip_camera_ios_rounded, color: Colors.white, size: 24),
                        onPressed: () => _scannerController.switchCamera(),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // ── Viewfinder with Green Corners and Animated Laser Line ──
          Center(
            child: SizedBox(
              width: frameSize,
              height: frameSize,
              child: Stack(
                children: [
                  // Top-Left Corner
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                          left: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                        ),
                      ),
                    ),
                  ),
                  // Top-Right Corner
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                          right: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                        ),
                      ),
                    ),
                  ),
                  // Bottom-Left Corner
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                          left: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                        ),
                      ),
                    ),
                  ),
                  // Bottom-Right Corner
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                          right: BorderSide(color: AppColors.primaryGreen, width: 4.5),
                        ),
                      ),
                    ),
                  ),

                  // Animated Scanning Laser Bar
                  AnimatedBuilder(
                    animation: _scanLineAnimation,
                    builder: (context, child) {
                      return Positioned(
                        top: _scanLineAnimation.value,
                        left: 10,
                        right: 10,
                        child: Container(
                          height: 3,
                          decoration: BoxDecoration(
                            color: AppColors.mintGreen,
                            borderRadius: BorderRadius.circular(2),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primaryGreen.withAlpha(220),
                                blurRadius: 10,
                                spreadRadius: 3,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // ── Align prompt ──
          Positioned(
            top: MediaQuery.of(context).size.height * 0.5 + (frameSize / 2) + 20,
            left: 20,
            right: 20,
            child: Text(
              'Align the Smart Bin QR code within the frame',
              textAlign: TextAlign.center,
              style: AppTypography.bodyPlex.copyWith(
                color: Colors.white.withAlpha(200),
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),

          // ── Bottom Action Buttons matching PDF Screen 7 ──
          Positioned(
            bottom: 40,
            left: 24,
            right: 24,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Scan Bin Button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.deepForest,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  icon: _isProcessing
                      ? const SizedBox.shrink()
                      : const Icon(Icons.qr_code_scanner, size: 22),
                  label: _isProcessing
                      ? const SizedBox(
                          height: 22,
                          width: 22,
                          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                        )
                      : const Text('Scan Bin'),
                  onPressed: _isProcessing ? null : _triggerManualScan,
                ),
                const SizedBox(height: 12),

                // Back Button
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.darkSlate,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 54),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Back'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
