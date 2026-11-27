import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/wallet/data/models/ledger_entry_model.dart';
import 'package:ecobin/features/wallet/domain/entities/ledger_entry_entity.dart';
import 'package:ecobin/features/wallet/domain/repositories/wallet_repository.dart';
import 'package:ecobin/features/wallet/presentation/viewmodels/wallet_viewmodel.dart';
import 'package:ecobin/features/wallet/presentation/views/wallet_view.dart';

class FakeWalletRepository implements WalletRepository {
  @override
  Future<Result<Map<String, dynamic>>> getWalletBalance() async {
    return Result.success({
      'availablePoints': 780,
      'lifetimeEarnedPoints': 3120,
    });
  }

  @override
  Future<Result<List<LedgerEntryEntity>>> getLedger() async {
    // Use exact backend JSON payload (int transactionId, nullable fields)
    final backendItems = [
      {
        'transactionId': 1,
        'timestamp': '2026-11-25T10:19:40.4790868',
        'timeFormatted': 'Nov 25, 10:19 AM',
        'binId': null,
        'entryType': 'credit',
        'type': 'credit',
        'title': 'Recycle Survey Bonus',
        'pointsDelta': 50,
        'balanceAfter': 1420,
        'source': 'session_confirm',
        'sourceId': null,
      },
      {
        'transactionId': 2,
        'timestamp': '2026-11-24T12:19:40.4791263',
        'timeFormatted': 'Nov 24, 12:19 PM',
        'binId': null,
        'entryType': 'debit',
        'type': 'debit',
        'title': 'Gift Redeem',
        'pointsDelta': -100,
        'balanceAfter': 1370,
        'source': 'voucher_redemption',
        'sourceId': 1,
      },
    ];

    return Result.success(
      backendItems.map(LedgerEntryModel.fromJson).toList(),
    );
  }
}

void main() {
  testWidgets('WalletView parses backend integer transactionId ledger entries and filters them', (tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.75;
    addTearDown(() => tester.view.resetPhysicalSize());

    final walletVm = WalletViewModel(walletRepository: FakeWalletRepository());

    await tester.pumpWidget(
      ChangeNotifierProvider<WalletViewModel>.value(
        value: walletVm,
        child: const MaterialApp(
          home: WalletView(),
        ),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('780 pts'), findsOneWidget);
    expect(find.text('Recycle Survey Bonus'), findsOneWidget);
    expect(find.text('Gift Redeem'), findsOneWidget);
    expect(find.text('+50 PTS'), findsOneWidget);
    expect(find.text('-100 PTS'), findsOneWidget);

    await tester.tap(find.text('Earned'));
    await tester.pumpAndSettle();
    expect(find.text('Recycle Survey Bonus'), findsOneWidget);
    expect(find.text('Gift Redeem'), findsNothing);

    await tester.tap(find.text('Spent'));
    await tester.pumpAndSettle();
    expect(find.text('Recycle Survey Bonus'), findsNothing);
    expect(find.text('Gift Redeem'), findsOneWidget);
  });
}
