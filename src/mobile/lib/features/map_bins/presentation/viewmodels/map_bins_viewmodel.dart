import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:dio/dio.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../domain/entities/bin_entity.dart';
import '../../domain/repositories/bins_repository.dart';

class MapBinsViewModel extends ChangeNotifier {
  final BinsRepository binsRepository;

  MapBinsViewModel({required this.binsRepository});

  List<BinEntity> _bins = [];
  BinEntity? _selectedBin;
  bool _isLoading = false;
  String? _errorMessage;
  String _searchQuery = 'Cairo, El Tahrir, AUC';

  // ── GPS & Location ──
  Position? _userPosition;
  bool _isLocating = false;
  bool _hasLocationPermission = false;
  StreamSubscription<Position>? _positionSubscription;

  // ── Navigation & Directions ──
  bool _isNavigating = false;
  List<LatLng> _routePoints = [];

  List<BinEntity> get bins => _bins;
  BinEntity? get selectedBin => _selectedBin;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  String get searchQuery => _searchQuery;

  bool get isLocating => _isLocating;
  bool get hasLocationPermission => _hasLocationPermission;
  bool get isNavigating => _isNavigating;
  List<LatLng> get routePoints => _routePoints;

  /// Default fallback: AUC Tahrir campus, Cairo
  static const double defaultLat = 30.0444;
  static const double defaultLng = 31.2357;

  double get userLatitude => _userPosition?.latitude ?? defaultLat;
  double get userLongitude => _userPosition?.longitude ?? defaultLng;
  LatLng get userLatLng => LatLng(userLatitude, userLongitude);
  bool get hasGpsFix => _userPosition != null;

  // Nearest bin is selected or first
  BinEntity? get nearestBin {
    if (_bins.isEmpty) return null;
    return _selectedBin ?? _bins.first;
  }

  List<BinEntity> get otherNearbyBins {
    if (_bins.length <= 1) return [];
    final nearest = nearestBin;
    return _bins.where((b) => b.binId != nearest?.binId).toList();
  }

  Future<void> init() async {
    await determinePosition();
    await fetchNearbyBins();
  }

  /// Request GPS permission and acquire current position
  Future<void> determinePosition() async {
    _isLocating = true;
    notifyListeners();

    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        _isLocating = false;
        notifyListeners();
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          _hasLocationPermission = false;
          _isLocating = false;
          notifyListeners();
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        _hasLocationPermission = false;
        _isLocating = false;
        notifyListeners();
        return;
      }

      _hasLocationPermission = true;

      // Get initial position
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 8),
        ),
      );

      _userPosition = position;
      _updateBinsDistances();

      // Listen to real-time location stream for moving dot & navigation
      _startPositionStream();
    } catch (e) {
      debugPrint('Error obtaining GPS location: $e');
    } finally {
      _isLocating = false;
      notifyListeners();
    }
  }

  void _startPositionStream() {
    _positionSubscription?.cancel();
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 8, // update every 8 meters
      ),
    ).listen((newPos) {
      _userPosition = newPos;
      _updateBinsDistances();
      if (_isNavigating && _selectedBin != null) {
        _generateRouteToBin(_selectedBin!);
      }
      notifyListeners();
    });
  }

  /// Recalculates distance and walk time to all bins based on current user GPS
  void _updateBinsDistances() {
    if (_bins.isEmpty) return;

    _bins = _bins.map((bin) {
      final meters = Geolocator.distanceBetween(
        userLatitude,
        userLongitude,
        bin.latitude,
        bin.longitude,
      ).round();

      final walkMinutes = (meters / 80).ceil(); // ~80m per min
      return bin.copyWith(
        distanceMeters: meters,
        walkingMinutes: walkMinutes > 0 ? walkMinutes : 1,
      );
    }).toList();

    // Re-sync selected bin reference
    if (_selectedBin != null) {
      _selectedBin = _bins.firstWhere(
        (b) => b.binId == _selectedBin!.binId,
        orElse: () => _selectedBin!,
      );
    }
  }

  Future<void> fetchNearbyBins() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    var result = await binsRepository.getNearbyBins(
      latitude: userLatitude,
      longitude: userLongitude,
      radiusKm: 10.0,
    );

    // If no bins within 10km (e.g. emulator GPS offset), widen search before replacing
    var shouldWiden = false;
    result.when(
      onSuccess: (data) => shouldWiden = data.isEmpty,
      onFailure: (_) {},
    );
    if (shouldWiden) {
      result = await binsRepository.getNearbyBins(
        latitude: userLatitude,
        longitude: userLongitude,
        radiusKm: 50000.0,
      );
    }

    _isLoading = false;
    result.when(
      onSuccess: (data) {
        if (data.isNotEmpty || _bins.isEmpty) {
          _bins = data;
          _updateBinsDistances();
          if (_bins.isNotEmpty && _selectedBin == null) {
            selectBin(_bins.first);
          }
        }
      },
      onFailure: (error) {
        // Keep previously loaded bins so transient network drops don't blank the map
        _errorMessage = error.replaceFirst('Exception: ', '');
      },
    );
    notifyListeners();
  }

  /// Select a bin and automatically generate walking directions to it
  void selectBin(BinEntity bin, {bool startNavigation = true}) {
    _selectedBin = bin;
    if (startNavigation) {
      _isNavigating = true;
      _generateRouteToBin(bin);
    }
    notifyListeners();
  }

  /// Build pedestrian walking route URL using OpenStreetMap's foot-routing server.
  static String buildWalkingRouteUrl(LatLng start, LatLng end) {
    return 'https://routing.openstreetmap.de/routed-foot/route/v1/foot/'
        '${start.longitude},${start.latitude};${end.longitude},${end.latitude}'
        '?overview=full&geometries=geojson';
  }

  /// Build external turn-by-turn navigation URI locked to walking mode.
  static List<Uri> buildWalkingNavigationUris({
    required double originLat,
    required double originLng,
    required double destLat,
    required double destLng,
    TargetPlatform? platformOverride,
  }) {
    final platform = platformOverride ?? defaultTargetPlatform;
    final webUri = Uri.parse(
      'https://www.google.com/maps/dir/?api=1'
      '&origin=$originLat,$originLng'
      '&destination=$destLat,$destLng'
      '&travelmode=walking&dir_action=navigate',
    );

    if (!kIsWeb && platform == TargetPlatform.android) {
      return [
        Uri.parse('google.navigation:q=$destLat,$destLng&mode=w'),
        webUri,
      ];
    }

    if (!kIsWeb && platform == TargetPlatform.iOS) {
      return [
        Uri.parse(
          'https://maps.apple.com/?saddr=$originLat,$originLng'
          '&daddr=$destLat,$destLng&dirflg=w',
        ),
        webUri,
      ];
    }

    return [webUri];
  }

  /// Calculate walking route between current user GPS and selected bin
  Future<void> _generateRouteToBin(BinEntity bin) async {
    final start = userLatLng;
    final end = LatLng(bin.latitude, bin.longitude);

    try {
      // Query FOSSGIS OSM pedestrian routing engine (real sidewalks/footpaths, not car lanes)
      final url = buildWalkingRouteUrl(start, end);

      final response = await Dio().get(
        url,
        options: Options(receiveTimeout: const Duration(seconds: 5)),
      );

      if (response.statusCode == 200 && response.data['routes'] != null) {
        final routes = response.data['routes'] as List;
        if (routes.isNotEmpty) {
          final route = routes[0];
          final geometry = route['geometry'];
          final coordinates = geometry['coordinates'] as List;

          _routePoints = coordinates.map<LatLng>((coord) {
            return LatLng(
              (coord[1] as num).toDouble(),
              (coord[0] as num).toDouble(),
            );
          }).toList();

          final distMeters = (route['distance'] as num?)?.round();
          final durationSeconds = (route['duration'] as num?)?.toDouble();
          if (distMeters != null && durationSeconds != null) {
            final walkMin = (durationSeconds / 60.0).ceil().clamp(1, 999);
            final updated = bin.copyWith(
              distanceMeters: distMeters,
              walkingMinutes: walkMin,
            );
            _selectedBin = updated;
            _bins = _bins
                .map((b) => b.binId == bin.binId ? updated : b)
                .toList();
          }

          notifyListeners();
          return;
        }
      }
    } catch (_) {
      // Offline fallback: direct walking line
    }

    _routePoints = [start, end];
    notifyListeners();
  }

  /// Open external turn-by-turn walking navigation in Google Maps / Apple Maps
  Future<void> openExternalNavigation(BinEntity bin) async {
    final uris = buildWalkingNavigationUris(
      originLat: userLatitude,
      originLng: userLongitude,
      destLat: bin.latitude,
      destLng: bin.longitude,
    );

    for (final uri in uris) {
      if (await canLaunchUrl(uri)) {
        final launched = await launchUrl(
          uri,
          mode: LaunchMode.externalApplication,
        );
        if (launched) return;
      }
    }
  }

  void stopNavigation() {
    _isNavigating = false;
    _routePoints = [];
    notifyListeners();
  }

  Future<void> search(String query) async {
    _searchQuery = query;
    _isLoading = true;
    notifyListeners();

    final result = await binsRepository.searchBins(
      query: query,
      latitude: userLatitude,
      longitude: userLongitude,
    );

    _isLoading = false;
    result.when(
      onSuccess: (data) {
        _bins = data;
        _updateBinsDistances();
        if (_bins.isNotEmpty) {
          selectBin(_bins.first);
        }
      },
      onFailure: (error) {
        _errorMessage = error;
      },
    );
    notifyListeners();
  }

  @override
  void dispose() {
    _positionSubscription?.cancel();
    super.dispose();
  }
}
