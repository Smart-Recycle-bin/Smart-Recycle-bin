import '../../domain/entities/bin_entity.dart';

class BinModel extends BinEntity {
  const BinModel({
    required super.binId,
    required super.name,
    super.qrCode,
    required super.latitude,
    required super.longitude,
    required super.district,
    required super.status,
    required super.fillLevel,
    required super.distanceMeters,
    required super.walkingMinutes,
  });

  factory BinModel.fromJson(Map<String, dynamic> json) {
    final id = json['binId']?.toString() ?? '';
    final nameStr = json['name'] as String? ?? (id.isNotEmpty ? 'Bin#$id' : 'Bin#101');
    final qr = json['qrCode']?.toString();

    return BinModel(
      binId: id,
      name: nameStr,
      qrCode: (qr != null && qr.isNotEmpty) ? qr : null,
      latitude: (json['latitude'] as num?)?.toDouble() ?? 30.0444,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 31.2357,
      district: json['district'] as String? ?? 'Downtown Cairo',
      status: (json['status'] as String?)?.toUpperCase() ?? 'AVAILABLE',
      fillLevel: (json['fillLevel'] as num?)?.toInt() ?? 0,
      distanceMeters: (json['distanceMeters'] as num?)?.toInt() ?? 140,
      walkingMinutes: (json['walkingTimeMinutes'] as num?)?.toInt() ?? 2,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'binId': binId,
      'name': name,
      if (qrCode != null) 'qrCode': qrCode,
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
