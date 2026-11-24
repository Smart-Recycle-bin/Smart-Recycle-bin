import '../../../../core/utils/result.dart';
import '../../domain/entities/ledger_entry_entity.dart';
import '../../domain/repositories/wallet_repository.dart';
import '../datasources/wallet_remote_data_source.dart';

class WalletRepositoryImpl implements WalletRepository {
  final WalletRemoteDataSource remoteDataSource;

  WalletRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<Map<String, dynamic>>> getWalletBalance() async {
    try {
      final balance = await remoteDataSource.getWalletBalance();
      return Result.success(balance);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<List<LedgerEntryEntity>>> getLedger() async {
    try {
      final ledger = await remoteDataSource.getLedger();
      return Result.success(ledger);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
