import 'package:flutter/material.dart';
import '../../../map_bins/presentation/views/map_view.dart';
import '../../../survey/presentation/views/surveys_list_view.dart';
import '../../../marketplace/presentation/views/marketplace_view.dart';
import '../../../wallet/presentation/views/wallet_view.dart';
import '../../../profile/presentation/views/profile_view.dart';
import '../../../scan_session/presentation/views/scan_bin_view.dart';
import '../widgets/ecobin_bottom_nav_bar.dart';

class MainShellView extends StatefulWidget {
  final int initialIndex;

  const MainShellView({super.key, this.initialIndex = 0});

  @override
  State<MainShellView> createState() => _MainShellViewState();
}

class _MainShellViewState extends State<MainShellView> {
  late int _currentIndex;

  final List<Widget> _pages = const [
    MapView(),          // Index 0: Map
    SurveysListView(),  // Index 1: Survey
    SizedBox.shrink(),  // Index 2: Scan (Handled by action)
    MarketplaceView(),  // Index 3: Market
    WalletView(),       // Index 4: Wallet
    ProfileView(isInsideShell: true), // Index 5: Profile (Page 14 of PDF)
  ];

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  void _onItemTapped(int index) {
    if (index == 2) {
      // Trigger QR Scanner View
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ScanBinView()),
      );
      return;
    }
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex == 2 ? 0 : _currentIndex,
        children: _pages,
      ),
      bottomNavigationBar: EcoBinBottomNavBar(
        currentIndex: _currentIndex == 5 ? -1 : _currentIndex,
        onItemTapped: _onItemTapped,
      ),
    );
  }
}
