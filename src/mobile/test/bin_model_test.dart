import 'package:flutter_test/flutter_test.dart';
import 'package:ecobin/features/map_bins/data/models/bin_model.dart';

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
}
