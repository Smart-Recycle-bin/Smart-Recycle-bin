import '../../domain/entities/bin_entity.dart';

class BinModel extends BinEntity {
  const BinModel({
    required super.binId,
    required super.name,
    required super.latitude,
    required super.longitude,
    required super.district,
    required super.status,
    required super.fillLevel,
    required super.distanceMeters,
    required super.walkingMinutes,
  });

  factory BinModel.fromJson(Map<String, dynamic> json) {
    return BinModel(
      binId: json['binId'] ?? '',
      name: json['name'] ?? 'Bin#${json['binId']?.replaceAll('bin-', '') ?? '101'}',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 30.0444,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 31.2357,
      district: json['district'] ?? 'Downtown Cairo',
      status: json['status'] ?? 'AVAILABLE',
      fillLevel: json['fillLevel'] ?? 10,
      distanceMeters: json['distanceMeters'] ?? 140,
      walkingMinutes: json['walkingTimeMinutes'] ?? 2,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'binId': binId,
      'name': name,
      'latitude': latitude,
      'longitude': longitude,
      'district': district,
      'status': status,
      'fillLevel': fillLevel,
      'distanceMeters': distanceMeters,
      'walkingTimeMinutes': walkingMinutes,
    };
  }
}
