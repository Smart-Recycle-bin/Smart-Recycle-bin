import '../../../../core/utils/result.dart';
import '../entities/bin_entity.dart';

abstract class BinsRepository {
  Future<Result<List<BinEntity>>> getNearbyBins({
    required double latitude,
    required double longitude,
    double radiusKm = 5.0,
  });

  Future<Result<List<BinEntity>>> searchBins({
    required String query,
    double? latitude,
    double? longitude,
  });

  Future<Result<BinEntity>> getBinDetails(String binId);
}
