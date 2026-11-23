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

    final result = await binsRepository.getNearbyBins(
      latitude: userLatitude,
      longitude: userLongitude,
      radiusKm: 1.0,
    );

    _isLoading = false;
    result.when(
      onSuccess: (data) {
        _bins = data;
        _updateBinsDistances();
        if (_bins.isNotEmpty && _selectedBin == null) {
          selectBin(_bins.first);
        }
      },
      onFailure: (error) {
        _errorMessage = error;
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

  /// Calculate walking route between current user GPS and selected bin
  Future<void> _generateRouteToBin(BinEntity bin) async {
    final start = userLatLng;
    final end = LatLng(bin.latitude, bin.longitude);

    try {
      // Query Open Source Routing Machine (OSRM) free walking routing
      final url =
          'https://router.project-osrm.org/route/v1/foot/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?overview=full&geometries=geojson';

      final response = await Dio().get(
        url,
        options: Options(receiveTimeout: const Duration(seconds: 4)),
      );

      if (response.statusCode == 200 && response.data['routes'] != null) {
        final routes = response.data['routes'] as List;
        if (routes.isNotEmpty) {
          final geometry = routes[0]['geometry'];
          final coordinates = geometry['coordinates'] as List;

          _routePoints = coordinates.map<LatLng>((coord) {
            return LatLng(
              (coord[1] as num).toDouble(),
              (coord[0] as num).toDouble(),
            );
          }).toList();

          notifyListeners();
          return;
        }
      }
    } catch (_) {
      // Offline fallback: generate realistic walking waypoints
    }

    // Fallback: direct waypoints with slight dogleg to emulate city streets
    final midLat = (start.latitude + end.latitude) / 2;
    _routePoints = [
      start,
      LatLng(midLat, start.longitude),
      LatLng(midLat, end.longitude),
      end,
    ];
    notifyListeners();
  }

  /// Open external turn-by-turn navigation in Google Maps / Apple Maps
  Future<void> openExternalNavigation(BinEntity bin) async {
    final url =
        'https://www.google.com/maps/dir/?api=1&origin=$userLatitude,$userLongitude&destination=${bin.latitude},${bin.longitude}&travelmode=walking';

    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
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
