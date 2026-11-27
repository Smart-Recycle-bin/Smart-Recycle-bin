class BinEntity {
  final String binId;
  final String name;
  final String? qrCode;
  final double latitude;
  final double longitude;
  final String district;
  final String status; // 'AVAILABLE', 'UNAVAILABLE', 'FULL'
  final int fillLevel; // Percentage 0 - 100
  final int distanceMeters;
  final int walkingMinutes;

  const BinEntity({
    required this.binId,
    required this.name,
    this.qrCode,
    required this.latitude,
    required this.longitude,
    required this.district,
    required this.status,
    required this.fillLevel,
    required this.distanceMeters,
    required this.walkingMinutes,
  });

  bool get isAvailable => status.toUpperCase() == 'AVAILABLE';

  String get distanceFormatted {
    if (distanceMeters >= 1000) {
      return '${(distanceMeters / 1000).toStringAsFixed(1)}Km away';
    }
    return '${distanceMeters}m away';
  }

  String get walkingTimeFormatted {
    return '$walkingMinutes min-${distanceMeters >= 1000 ? "${(distanceMeters / 1000).toStringAsFixed(1)}Km" : "${distanceMeters}m"}';
  }

  BinEntity copyWith({
    String? binId,
    String? name,
    String? qrCode,
    double? latitude,
    double? longitude,
    String? district,
    String? status,
    int? fillLevel,
    int? distanceMeters,
    int? walkingMinutes,
  }) {
    return BinEntity(
      binId: binId ?? this.binId,
      name: name ?? this.name,
      qrCode: qrCode ?? this.qrCode,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      district: district ?? this.district,
      status: status ?? this.status,
      fillLevel: fillLevel ?? this.fillLevel,
      distanceMeters: distanceMeters ?? this.distanceMeters,
      walkingMinutes: walkingMinutes ?? this.walkingMinutes,
    );
  }
}
