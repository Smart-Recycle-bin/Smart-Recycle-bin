import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/features/marketplace/presentation/views/marketplace_view.dart';
import 'package:ecobin/features/marketplace/presentation/viewmodels/marketplace_viewmodel.dart';
import 'package:ecobin/features/marketplace/domain/repositories/marketplace_repository.dart';
import 'package:ecobin/features/marketplace/domain/entities/catalog_item_entity.dart';
import 'package:ecobin/features/wallet/domain/entities/ledger_entry_entity.dart';
import 'package:ecobin/features/wallet/domain/repositories/wallet_repository.dart';
import 'package:ecobin/features/wallet/presentation/viewmodels/wallet_viewmodel.dart';
import 'package:ecobin/core/utils/result.dart';

class MockMarketplaceRepo implements MarketplaceRepository {
  @override
  Future<Result<List<CatalogItemEntity>>> getCatalog() async {
    return Result.success([
      const CatalogItemEntity(
        itemId: 'cat-vodafone',
        brand: 'vodafone',
        title: 'Vodafone Internet E£ 5 Pounds',
        description: 'Test description',
        logoUrl: 'assets/images/vodafone_logo.png',
        defaultPointsCost: 5000,
        denominations: [],
      ),
      const CatalogItemEntity(
        itemId: 'cat-carrefour',
        brand: 'Carrefour',
        title: 'Carrefour Voucher E£ 10 Pounds',
        description: 'Test description',
        logoUrl: 'assets/images/carrefour_logo.png',
        defaultPointsCost: 10000,
        denominations: [],
      ),
    ]);
  }

  @override
  Future<Result<List<SpotlightBannerEntity>>> getSpotlightBanners() async {
    return Result.success([]);
  }

  @override
  Future<Result<CatalogItemEntity>> getItemDetails(String itemId) async {
    throw UnimplementedError();
  }

  @override
  Future<Result<String>> redeemReward({
    required String itemId,
    required int denominationEgp,
    required int pointsCost,
  }) async {
    return Result.success('TEST-CODE');
  }
}

class MockWalletRepo implements WalletRepository {
  int currentPoints;
  MockWalletRepo({this.currentPoints = 780});

  @override
  Future<Result<Map<String, dynamic>>> getWalletBalance() async {
    return Result.success({
      'availablePoints': currentPoints,
      'lifetimeEarnedPoints': 3120,
    });
  }

  @override
  Future<Result<List<LedgerEntryEntity>>> getLedger() async {
    return Result.success([]);
  }
}

void main() {
  testWidgets('MarketplaceView renders reward card with points badge and redeem button', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final repo = MockMarketplaceRepo();
    final vm = MarketplaceViewModel(marketplaceRepository: repo);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<MarketplaceViewModel>.value(value: vm),
        ],
        child: const MaterialApp(
          home: MarketplaceView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    // Verify 5000 and PTS are rendered
    expect(find.text('5000'), findsOneWidget);
    expect(find.text('10000'), findsOneWidget);
    expect(find.text('PTS'), findsNWidgets(2));

    // Verify Titles
    expect(find.text('Vodafone Internet E£ 5 Pounds'), findsOneWidget);
    expect(find.text('Carrefour Voucher E£ 10 Pounds'), findsOneWidget);

    // Verify Redeem buttons
    expect(find.text('Redeem'), findsNWidgets(2));
  });

  testWidgets('MarketplaceView syncs balance points with WalletViewModel and supports refresh', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final marketRepo = MockMarketplaceRepo();
    final walletRepo = MockWalletRepo(currentPoints: 780);
    final walletVm = WalletViewModel(walletRepository: walletRepo);
    final marketVm = MarketplaceViewModel(
      marketplaceRepository: marketRepo,
      walletRepository: walletRepo,
    );

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<WalletViewModel>.value(value: walletVm),
          ChangeNotifierProvider<MarketplaceViewModel>.value(value: marketVm),
        ],
        child: const MaterialApp(
          home: MarketplaceView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('780 pts'), findsOneWidget);
    expect(find.text('780 PTS', findRichText: true), findsOneWidget);

    // Simulate backend points change and tap refresh button
    walletRepo.currentPoints = 280;
    await tester.tap(find.byTooltip('Refresh'));
    await tester.pumpAndSettle();

    expect(find.text('280 pts'), findsOneWidget);
    expect(find.text('280 PTS', findRichText: true), findsOneWidget);
  });
}
