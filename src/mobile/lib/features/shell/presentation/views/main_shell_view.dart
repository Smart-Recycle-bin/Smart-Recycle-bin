import 'package:flutter/material.dart';
import '../../../../core/utils/provider_helpers.dart';
import '../../../map_bins/presentation/viewmodels/map_bins_viewmodel.dart';
import '../../../map_bins/presentation/views/map_view.dart';
import '../../../survey/presentation/viewmodels/surveys_list_viewmodel.dart';
import '../../../survey/presentation/views/surveys_list_view.dart';
import '../../../marketplace/presentation/viewmodels/marketplace_viewmodel.dart';
import '../../../marketplace/presentation/views/marketplace_view.dart';
import '../../../wallet/presentation/viewmodels/wallet_viewmodel.dart';
import '../../../wallet/presentation/views/wallet_view.dart';
import '../../../profile/presentation/viewmodels/profile_viewmodel.dart';
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
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      context.maybeRead<WalletViewModel>()?.fetchWalletData();
      context.maybeRead<ProfileViewModel>()?.fetchProfile();
    });
  }

  Future<void> _refreshTabData(int index) async {
    if (!mounted) return;
    final walletVm = context.maybeRead<WalletViewModel>();
    final marketVm = context.maybeRead<MarketplaceViewModel>();

    final futures = <Future<void>>[
      if (walletVm != null) walletVm.fetchWalletData(),
    ];

    switch (index) {
      case 0:
        final mapVm = context.maybeRead<MapBinsViewModel>();
        if (mapVm != null) futures.add(mapVm.fetchNearbyBins());
        break;
      case 1:
        final surveyVm = context.maybeRead<SurveysListViewModel>();
        if (surveyVm != null) futures.add(surveyVm.fetchSurveys());
        break;
      case 3:
        if (marketVm != null) futures.add(marketVm.fetchMarketplaceData());
        break;
      case 5:
        final profileVm = context.maybeRead<ProfileViewModel>();
        if (profileVm != null) futures.add(profileVm.fetchProfile());
        break;
    }

    await Future.wait(futures);
    if (mounted && walletVm != null && marketVm != null) {
      marketVm.syncBalancePoints(walletVm.availablePoints);
    }
  }

  void _onItemTapped(int index) {
    if (index == 2) {
      // Trigger QR Scanner View
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const ScanBinView()),
      ).then((_) => _refreshTabData(_currentIndex));
      return;
    }
    setState(() {
      _currentIndex = index;
    });
    _refreshTabData(index);
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
