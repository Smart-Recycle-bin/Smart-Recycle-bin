import '../../../../core/utils/result.dart';
import '../../domain/entities/bin_entity.dart';
import '../../domain/repositories/bins_repository.dart';
import '../datasources/bins_remote_data_source.dart';

class BinsRepositoryImpl implements BinsRepository {
  final BinsRemoteDataSource remoteDataSource;

  BinsRepositoryImpl({required this.remoteDataSource});

  @override
  Future<Result<List<BinEntity>>> getNearbyBins({
    required double latitude,
    required double longitude,
    double radiusKm = 5.0,
  }) async {
    try {
      final bins = await remoteDataSource.getNearbyBins(latitude, longitude, radiusKm);
      return Result.success(bins);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<List<BinEntity>>> searchBins({
    required String query,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final bins = await remoteDataSource.searchBins(query, latitude, longitude);
      return Result.success(bins);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }

  @override
  Future<Result<BinEntity>> getBinDetails(String binId) async {
    try {
      final bin = await remoteDataSource.getBinDetails(binId);
      return Result.success(bin);
    } catch (e) {
      return Result.failure(e.toString());
    }
  }
}
