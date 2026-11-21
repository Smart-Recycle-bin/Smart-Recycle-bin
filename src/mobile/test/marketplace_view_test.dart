import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/features/marketplace/presentation/views/marketplace_view.dart';
import 'package:ecobin/features/marketplace/presentation/viewmodels/marketplace_viewmodel.dart';
import 'package:ecobin/features/marketplace/domain/repositories/marketplace_repository.dart';
import 'package:ecobin/features/marketplace/domain/entities/catalog_item_entity.dart';
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
}
