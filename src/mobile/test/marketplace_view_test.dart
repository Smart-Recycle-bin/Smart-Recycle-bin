import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/features/marketplace/data/models/catalog_item_model.dart';
import 'package:ecobin/features/marketplace/presentation/views/marketplace_view.dart';
import 'package:ecobin/features/marketplace/presentation/views/my_vouchers_view.dart';
import 'package:ecobin/features/marketplace/presentation/viewmodels/marketplace_viewmodel.dart';
import 'package:ecobin/features/marketplace/domain/repositories/marketplace_repository.dart';
import 'package:ecobin/features/marketplace/domain/entities/catalog_item_entity.dart';
import 'package:ecobin/features/marketplace/domain/entities/redeemed_voucher_entity.dart';
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

  final List<RedeemedVoucherEntity> vouchers = [
    RedeemedVoucherEntity(
      voucherId: 12,
      redemptionId: 12,
      itemTitle: 'Vodafone Internet E£ 5 Pounds',
      pointsSpent: 500,
      valueEgpAtRedemption: 5.0,
      voucherCode: 'TEL-A1B2-3456',
      redeemedAt: DateTime.utc(2026, 11, 26, 14, 0),
      status: 'unused',
    ),
    RedeemedVoucherEntity(
      voucherId: 11,
      redemptionId: 11,
      itemTitle: 'Metro Free Ticket',
      pointsSpent: 200,
      valueEgpAtRedemption: 2.0,
      voucherCode: 'TRA-9988-1122',
      redeemedAt: DateTime.utc(2026, 11, 20, 10, 0),
      status: 'expired',
    ),
  ];

  @override
  Future<Result<List<RedeemedVoucherEntity>>> getMyVouchers({String? status}) async {
    if (status == null || status == 'all') {
      return Result.success(List.of(vouchers));
    }
    return Result.success(
      vouchers.where((v) => v.status == status).toList(),
    );
  }
}

class MockWalletRepo implements WalletRepository {
  int currentPoints;
  bool shouldFail;
  MockWalletRepo({this.currentPoints = 780, this.shouldFail = false});

  @override
  Future<Result<Map<String, dynamic>>> getWalletBalance() async {
    if (shouldFail) {
      return const Result.failure('Session expired (401)');
    }
    return Result.success({
      'availablePoints': currentPoints,
      'lifetimeEarnedPoints': 3120,
    });
  }

  @override
  Future<Result<List<LedgerEntryEntity>>> getLedger() async {
    if (shouldFail) {
      return const Result.failure('Session expired (401)');
    }
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

  test('CatalogItemModel parses MohamedF integer itemId, startingPointsCost, and options', () {
    final card = CatalogItemModel.fromJson({
      'itemId': 3,
      'categoryId': 1,
      'brand': 'Telecom',
      'title': 'Vodafone 500MB',
      'logoUrl': 'assets/images/vodafone_logo.png',
      'startingPointsCost': 500,
      'optionsCount': 2,
      'status': 'in_stock',
    });

    expect(card.itemId, '3');
    expect(card.defaultPointsCost, 500);
    expect(card.inStock, true);
    expect(card.denominations.first.pointsCost, 500);

    final detail = CatalogItemModel.fromJson({
      'itemId': 3,
      'categoryId': 1,
      'brand': 'Telecom',
      'title': 'Vodafone 500MB',
      'pointsCost': 500,
      'inStock': true,
      'options': [
        {'itemId': 3, 'title': '500MB Pack', 'pointsCost': 500, 'inStock': true},
        {'itemId': 4, 'title': '2GB Pack', 'pointsCost': 1000, 'inStock': true},
      ],
    });

    expect(detail.denominations.length, 2);
    expect(detail.denominations[1].itemId, '4');
    expect(detail.denominations[1].label, '2GB Pack');
    expect(detail.denominations[1].pointsCost, 1000);
  });

  testWidgets('MyVouchersView displays redeemed vouchers and filters by status', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final vm = MarketplaceViewModel(marketplaceRepository: MockMarketplaceRepo());

    await tester.pumpWidget(
      ChangeNotifierProvider<MarketplaceViewModel>.value(
        value: vm,
        child: const MaterialApp(
          home: MyVouchersView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('My Vouchers'), findsOneWidget);
    expect(find.text('Vodafone Internet E£ 5 Pounds'), findsOneWidget);
    expect(find.text('TEL-A1B2-3456'), findsOneWidget);
    expect(find.text('Metro Free Ticket'), findsOneWidget);

    await tester.tap(find.text('Unused'));
    await tester.pumpAndSettle();

    expect(find.text('Vodafone Internet E£ 5 Pounds'), findsOneWidget);
    expect(find.text('Metro Free Ticket'), findsNothing);
  });

  testWidgets('MarketplaceView shows error banner when wallet refresh fails', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final marketRepo = MockMarketplaceRepo();
    final walletRepo = MockWalletRepo(currentPoints: 380);
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

    walletRepo.shouldFail = true;
    await tester.tap(find.byTooltip('Refresh'));
    await tester.pumpAndSettle();

    expect(find.text('Could not refresh balance: Session expired (401)'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
  });
}
