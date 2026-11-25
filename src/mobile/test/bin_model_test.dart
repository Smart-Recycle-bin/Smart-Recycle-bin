import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:latlong2/latlong.dart';
import 'package:ecobin/core/utils/result.dart';
import 'package:ecobin/features/map_bins/data/models/bin_model.dart';
import 'package:ecobin/features/map_bins/domain/entities/bin_entity.dart';
import 'package:ecobin/features/map_bins/domain/repositories/bins_repository.dart';
import 'package:ecobin/features/map_bins/presentation/viewmodels/map_bins_viewmodel.dart';

void main() {
  group('BinModel JSON Serialization Tests', () {
    test('Correctly parses backend E60 response with numeric ID and simplified status', () {
      final backendJson = {
        'binId': 45,
        'name': 'Bin#045',
        'latitude': 30.0444,
        'longitude': 31.2357,
        'status': 'AVAILABLE',
        'fillLevel': 12,
        'district': 'Downtown Cairo'
      };

      final model = BinModel.fromJson(backendJson);

      expect(model.binId, '45');
      expect(model.name, 'Bin#045');
      expect(model.latitude, 30.0444);
      expect(model.longitude, 31.2357);
      expect(model.status, 'AVAILABLE');
      expect(model.isAvailable, true);
      expect(model.district, 'Downtown Cairo');
    });

    test('Correctly parses backend E64 search response with distance and walking time', () {
      final searchJson = {
        'binId': 420,
        'name': 'Bin#420',
        'latitude': 30.0444,
        'longitude': 31.2357,
        'district': 'El Tahrir, Downtown',
        'status': 'AVAILABLE',
        'fillLevel': 34,
        'distanceMeters': 140,
        'walkingTimeMinutes': 2
      };

      final model = BinModel.fromJson(searchJson);

      expect(model.binId, '420');
      expect(model.status, 'AVAILABLE');
      expect(model.isAvailable, true);
      expect(model.distanceMeters, 140);
      expect(model.walkingMinutes, 2);
      expect(model.distanceFormatted, '140m away');
      expect(model.walkingTimeFormatted, '2 min-140m');
    });

    test('Correctly flags UNAVAILABLE status without displaying fillLevel', () {
      final unavailableJson = {
        'binId': 422,
        'name': 'Bin#422',
        'latitude': 30.0520,
        'longitude': 31.2410,
        'district': 'Ramses Hub',
        'status': 'UNAVAILABLE',
        'fillLevel': 98,
        'distanceMeters': 1200,
        'walkingTimeMinutes': 14
      };

      final model = BinModel.fromJson(unavailableJson);

      expect(model.binId, '422');
      expect(model.status, 'UNAVAILABLE');
      expect(model.isAvailable, false);
      expect(model.distanceFormatted, '1.2Km away');
    });
  });

  group('Walking Navigation Tests', () {
    test('Uses pedestrian routed-foot endpoint rather than car router', () {
      final url = MapBinsViewModel.buildWalkingRouteUrl(
        const LatLng(30.0444, 31.2357),
        const LatLng(30.0520, 31.2410),
      );

      expect(url, contains('routing.openstreetmap.de/routed-foot/route/v1/foot/'));
      expect(url, isNot(contains('router.project-osrm.org')));
    });

    test('Uses native walking mode on Android and Apple walking mode on iOS', () {
      final androidUris = MapBinsViewModel.buildWalkingNavigationUris(
        originLat: 30.0444,
        originLng: 31.2357,
        destLat: 30.0520,
        destLng: 31.2410,
        platformOverride: TargetPlatform.android,
      );
      expect(androidUris.first.toString(), 'google.navigation:q=30.052,31.241&mode=w');
      expect(androidUris.last.toString(), contains('travelmode=walking'));

      final iosUris = MapBinsViewModel.buildWalkingNavigationUris(
        originLat: 30.0444,
        originLng: 31.2357,
        destLat: 30.0520,
        destLng: 31.2410,
        platformOverride: TargetPlatform.iOS,
      );
      expect(iosUris.first.toString(), contains('dirflg=w'));
    });

    test('Preserves loaded bins if subsequent refresh fails with network error', () async {
      final repo = _FakeBinsRepo();
      final vm = MapBinsViewModel(binsRepository: repo);

      await vm.fetchNearbyBins();
      expect(vm.bins.length, 1);

      repo.shouldFail = true;
      await vm.fetchNearbyBins();

      expect(vm.bins.length, 1);
      expect(vm.errorMessage, contains('Connection failed'));
    });
  });
}

class _FakeBinsRepo implements BinsRepository {
  bool shouldFail = false;

  @override
  Future<Result<List<BinEntity>>> getNearbyBins({
    required double latitude,
    required double longitude,
    double radiusKm = 5.0,
  }) async {
    if (shouldFail) return Result.failure('Exception: Connection failed');
    return Result.success(const [
      BinEntity(
        binId: '1',
        name: 'Bin#001',
        latitude: 30.0444,
        longitude: 31.2357,
        district: 'Downtown Cairo',
        status: 'AVAILABLE',
        fillLevel: 12,
        distanceMeters: 80,
        walkingMinutes: 1,
      ),
    ]);
  }

  @override
  Future<Result<List<BinEntity>>> searchBins({
    required String query,
    double? latitude,
    double? longitude,
  }) async =>
      Result.success(const []);

  @override
  Future<Result<BinEntity>> getBinDetails(String binId) async {
    throw UnimplementedError();
  }
}
