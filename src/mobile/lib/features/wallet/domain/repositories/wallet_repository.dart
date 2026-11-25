import '../../../../core/utils/result.dart';
import '../entities/ledger_entry_entity.dart';

abstract class WalletRepository {
  Future<Result<Map<String, dynamic>>> getWalletBalance();
  Future<Result<List<LedgerEntryEntity>>> getLedger();
}
