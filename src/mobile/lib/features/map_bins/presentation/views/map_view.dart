import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart' hide Path;
import 'package:ecobin/core/constants/app_colors.dart';
import 'package:ecobin/core/constants/app_typography.dart';
import 'package:ecobin/features/map_bins/presentation/viewmodels/map_bins_viewmodel.dart';
import 'package:ecobin/features/scan_session/presentation/views/scan_bin_view.dart';
import 'package:ecobin/features/profile/presentation/views/profile_view.dart';

class MapView extends StatefulWidget {
  const MapView({super.key});

  @override
  State<MapView> createState() => _MapViewState();
}

class _MapViewState extends State<MapView> {
  final _searchController = TextEditingController(
    text: 'Cairo, El Tahrir, AUC',
  );
  final _mapController = MapController();

  static const _defaultZoom = 15.5;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final vm = context.read<MapBinsViewModel>();
      vm.init().then((_) {
        if (mounted) {
          _mapController.move(vm.userLatLng, _defaultZoom);
        }
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _mapController.dispose();
    super.dispose();
  }

  void _centerOnUser() async {
    final vm = context.read<MapBinsViewModel>();
    await vm.determinePosition();
    _mapController.move(vm.userLatLng, _defaultZoom);
  }

  void _focusOnRoute(LatLng userLoc, LatLng binLoc) {
    try {
      final bounds = LatLngBounds.fromPoints([userLoc, binLoc]);
      _mapController.fitCamera(
        CameraFit.bounds(
          bounds: bounds,
          padding: const EdgeInsets.only(
            top: 230,
            bottom: 300,
            left: 60,
            right: 60,
          ),
        ),
      );
    } catch (_) {
      _mapController.move(binLoc, _defaultZoom);
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<MapBinsViewModel>();
    final nearest = vm.nearestBin;
    final otherBins = vm.otherNearbyBins;

    // Markers list
    final markers = <Marker>[];

    // User location marker
    markers.add(
      Marker(
        point: vm.userLatLng,
        width: 24,
        height: 24,
        alignment: Alignment.center,
        child: _UserLocationMarker(
          isLocating: vm.isLocating,
          hasGps: vm.hasGpsFix,
        ),
      ),
    );

    // Bin markers (Triangular recycling pins matching UI design)
    for (final bin in vm.bins) {
      final isSelected = vm.selectedBin?.binId == bin.binId;
      markers.add(
        Marker(
          point: LatLng(bin.latitude, bin.longitude),
          width: isSelected ? 48 : 38,
          height: isSelected ? 56 : 42,
          alignment: Alignment.topCenter,
          child: GestureDetector(
            onTap: () {
              vm.selectBin(bin, startNavigation: true);
              _focusOnRoute(vm.userLatLng, LatLng(bin.latitude, bin.longitude));
            },
            child: _BinMarkerPin(
              label: isSelected ? bin.name : '',
              isSelected: isSelected,
              isAvailable: bin.isAvailable,
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.backgroundLight,
      body: Stack(
        children: [
          // ── Layer 1: Interactive Map (Full Screen behind header & sheet) ──
          Positioned.fill(
            child: FlutterMap(
              mapController: _mapController,
              options: MapOptions(
                initialCenter: vm.userLatLng,
                initialZoom: _defaultZoom,
                minZoom: 10,
                maxZoom: 19,
              ),
              children: [
                TileLayer(
                  urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                  userAgentPackageName: 'com.ecobin.app',
                ),

                // Walking route polyline when navigating to selected bin
                if (vm.isNavigating && vm.routePoints.isNotEmpty)
                  PolylineLayer(
                    polylines: [
                      Polyline(
                        points: vm.routePoints,
                        strokeWidth: 5.5,
                        color: AppColors.primaryGreen,
                        borderColor: Colors.white,
                        borderStrokeWidth: 2.0,
                        strokeCap: StrokeCap.round,
                        strokeJoin: StrokeJoin.round,
                      ),
                    ],
                  ),

                MarkerLayer(markers: markers),
              ],
            ),
          ),

          // ── Layer 2: Top Green Gradient Fade (Deep Forest Green fading into map) ──
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: 190,
            child: IgnorePointer(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      const Color(
                        0xFF064E3B,
                      ).withAlpha(200), // Rich forest green at top
                      const Color(0xFF0D5C46).withAlpha(120),
                      const Color(0xFF10B981).withAlpha(40),
                      Colors.transparent,
                    ],
                    stops: const [0.0, 0.15, 0.25, 0.35],
                  ),
                ),
              ),
            ),
          ),
          // ── Layer 3: Top Navigation, Titles & Full-Width Search Bar Overlay ──
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              bottom: false,
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: 18.0,
                  vertical: 6.0,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Row 1: EcoBin Logo + Points Pill & Avatar
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Left: EcoBin Logo
                        Row(
                          children: [
                            Image.asset(
                              'assets/images/app_logo.png',
                              width: 36,
                              height: 36,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'EcoBin',
                              style: AppTypography.titlePlex.copyWith(
                                fontSize: 22,
                                fontWeight: FontWeight.w800,
                                color: AppColors.deepForest,
                              ),
                            ),
                          ],
                        ),

                        // Right: Points Pill + Avatar
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 6,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.primaryGreen,
                                borderRadius: BorderRadius.circular(20),
                                boxShadow: [
                                  BoxShadow(
                                    color: AppColors.primaryGreen.withAlpha(80),
                                    blurRadius: 6,
                                    offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Text(
                                '1,420 pts',
                                style: AppTypography.badgeText.copyWith(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            GestureDetector(
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => const ProfileView(),
                                  ),
                                );
                              },
                              child: Container(
                                width: 38,
                                height: 38,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: Colors.white,
                                    width: 2,
                                  ),
                                  image: const DecorationImage(
                                    image: NetworkImage(
                                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                                    ),
                                    fit: BoxFit.cover,
                                  ),
                                  boxShadow: [
                                    BoxShadow(
                                      color: Colors.black.withAlpha(25),
                                      blurRadius: 4,
                                      offset: const Offset(0, 2),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),

                    const SizedBox(height: 14),

                    // Row 2: "NEARBY HUBS" & "Find Smart Bins Near You" + Target Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'NEARBY HUBS',
                              style: AppTypography.badgeText.copyWith(
                                color: AppColors.deepForest,
                                letterSpacing: 1.1,
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 1),
                            Text(
                              'Find Smart Bins Near You',
                              style: AppTypography.titlePlex.copyWith(
                                fontSize: 19,
                                fontWeight: FontWeight.bold,
                                color: AppColors.darkSlate,
                              ),
                            ),
                          ],
                        ),

                        // Mint green GPS target button matching UI
                        Container(
                          width: 44,
                          height: 44,
                          decoration: BoxDecoration(
                            color: const Color(0xFF34D399),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF34D399).withAlpha(120),
                                blurRadius: 8,
                                offset: const Offset(0, 3),
                              ),
                            ],
                          ),
                          child: IconButton(
                            icon: vm.isLocating
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(
                                    Icons.gps_fixed_rounded,
                                    color: Colors.white,
                                    size: 22,
                                  ),
                            padding: EdgeInsets.zero,
                            onPressed: _centerOnUser,
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 12),

                    // Row 3: Full-Width Search Bar Pill
                    Container(
                      height: 48,
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withAlpha(18),
                            blurRadius: 10,
                            offset: const Offset(0, 3),
                          ),
                        ],
                      ),
                      child: Row(
                        children: [
                          const Icon(
                            Icons.search_rounded,
                            color: AppColors.primaryGreen,
                            size: 24,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: TextField(
                              controller: _searchController,
                              style: AppTypography.bodyPlex.copyWith(
                                color: AppColors.textSecondary,
                                fontWeight: FontWeight.w500,
                                fontSize: 15,
                              ),
                              decoration: const InputDecoration(
                                border: InputBorder.none,
                                enabledBorder: InputBorder.none,
                                focusedBorder: InputBorder.none,
                                contentPadding: EdgeInsets.zero,
                                isDense: true,
                                hintText: 'Cairo, El Tahrir, AUC',
                                hintStyle: TextStyle(
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              onSubmitted: (val) => vm.search(val),
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Active Walking Navigation Banner (if directions enabled)
                    if (vm.isNavigating && vm.selectedBin != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 14,
                          vertical: 7,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.deepForest,
                          borderRadius: BorderRadius.circular(20),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.deepForest.withAlpha(80),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.directions_walk_rounded,
                              color: AppColors.mintGreen,
                              size: 18,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Walking to ${vm.selectedBin!.name} • ${vm.selectedBin!.distanceFormatted} (${vm.selectedBin!.walkingMinutes} min)',
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: AppTypography.badgeText.copyWith(
                                  color: Colors.white,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                Icons.open_in_new,
                                color: Colors.white,
                                size: 16,
                              ),
                              tooltip: 'Open in Google Maps',
                              padding: EdgeInsets.zero,
                              constraints: const BoxConstraints(),
                              onPressed: () =>
                                  vm.openExternalNavigation(vm.selectedBin!),
                            ),
                            const SizedBox(width: 8),
                            GestureDetector(
                              onTap: () => vm.stopNavigation(),
                              child: const Icon(
                                Icons.close,
                                color: Colors.white70,
                                size: 16,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ),

          // ── Layer 4: Bottom Sheet matching UI (Nearest Bin Card & Other Bins) ──
          DraggableScrollableSheet(
            initialChildSize: 0.42,
            minChildSize: 0.28,
            maxChildSize: 0.72,
            builder: (context, scrollController) {
              return Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: const Alignment(0, -0.85),
                    colors: [
                      Colors.white.withAlpha(0),
                      Colors.white.withAlpha(160),
                      const Color(0xFFF1F5F9),
                    ],
                    stops: const [0.0, 0.40, 0.85],
                  ),
                ),
                child: ListView(
                  controller: scrollController,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 18,
                    vertical: 8,
                  ),
                  children: [
                    const SizedBox(height: 10),

                    // ── Nearest Bin Card (White Rounded Card matching UI) ──
                    if (nearest != null) ...[
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withAlpha(10),
                              blurRadius: 8,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Row 1: Nearest Bin + distance away + walking pill
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                RichText(
                                  text: TextSpan(
                                    text: 'Nearest Bin ',
                                    style: AppTypography.titlePlex.copyWith(
                                      fontSize: 18,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.darkSlate,
                                    ),
                                    children: [
                                      TextSpan(
                                        text: nearest.distanceFormatted,
                                        style: AppTypography.subtitlePlex
                                            .copyWith(
                                              color: AppColors.primaryGreen,
                                              fontWeight: FontWeight.w600,
                                              fontSize: 14,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Walking pill
                                GestureDetector(
                                  onTap: () {
                                    vm.selectBin(
                                      nearest,
                                      startNavigation: true,
                                    );
                                    _focusOnRoute(
                                      vm.userLatLng,
                                      LatLng(
                                        nearest.latitude,
                                        nearest.longitude,
                                      ),
                                    );
                                  },
                                  child: _WalkingPill(
                                    label: nearest.walkingTimeFormatted,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),

                            // Row 2: Bin#420 + Available status
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  nearest.name,
                                  style: AppTypography.titlePlex.copyWith(
                                    fontSize: 20,
                                    color: AppColors.primaryGreen,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                _StatusBadge(isAvailable: nearest.isAvailable),
                              ],
                            ),
                            const SizedBox(height: 14),

                            // Row 3: Scan Bin Button
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.deepForest,
                                  foregroundColor: Colors.white,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(24),
                                  ),
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 14,
                                  ),
                                ),
                                icon: const Icon(
                                  Icons.qr_code_scanner_rounded,
                                  size: 22,
                                ),
                                label: const Text(
                                  'Scan Bin',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                onPressed: () {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ScanBinView(
                                        initialBinId: nearest.binId,
                                      ),
                                    ),
                                  );
                                },
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // ── Other Bins Section Title ──
                    Text(
                      'OTHER BINS NEARBY',
                      style: AppTypography.badgeText.copyWith(
                        color: const Color(0xFF64748B),
                        letterSpacing: 0.8,
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // ── List of Other Bins matching UI design ──
                    ...otherBins.map((bin) {
                      return GestureDetector(
                        onTap: () {
                          vm.selectBin(bin, startNavigation: true);
                          _focusOnRoute(
                            vm.userLatLng,
                            LatLng(bin.latitude, bin.longitude),
                          );
                        },
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 10,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(
                              30,
                            ), // Rounded pill card
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withAlpha(8),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          child: Row(
                            children: [
                              // Bin Name & Distance with Flexible constraint
                              Expanded(
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      bin.name,
                                      style: AppTypography.titlePlex.copyWith(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.darkSlate,
                                      ),
                                    ),
                                    const SizedBox(width: 4),
                                    Flexible(
                                      child: Text(
                                        bin.distanceFormatted,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: AppTypography.subtitlePlex
                                            .copyWith(
                                              color: AppColors.primaryGreen,
                                              fontSize: 12,
                                              fontWeight: FontWeight.w500,
                                            ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 4),

                              // Status (Available / Unavailable)
                              _StatusBadge(isAvailable: bin.isAvailable),
                              const SizedBox(width: 6),

                              // Time Pill
                              _WalkingPill(
                                label: bin.walkingTimeFormatted,
                                small: true,
                              ),
                              const SizedBox(width: 6),

                              // Walk icon circle button
                              Container(
                                width: 32,
                                height: 32,
                                decoration: const BoxDecoration(
                                  color: AppColors.primaryGreen,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.directions_walk_rounded,
                                  color: Colors.white,
                                  size: 17,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

// ── Custom Triangular Recycling Map Pin matching UI screenshot ────────────────

class _BinMarkerPin extends StatelessWidget {
  final String label;
  final bool isSelected;
  final bool isAvailable;

  const _BinMarkerPin({
    required this.label,
    required this.isSelected,
    required this.isAvailable,
  });

  @override
  Widget build(BuildContext context) {
    final double width = isSelected ? 38 : 30;
    final double height = isSelected ? 36 : 28;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(bottom: 2),
            child: Text(
              label,
              style: AppTypography.badgeText.copyWith(
                fontSize: 11,
                color: AppColors.darkSlate,
                fontWeight: FontWeight.w800,
                shadows: const [
                  Shadow(color: Colors.white, blurRadius: 4),
                  Shadow(color: Colors.white, blurRadius: 8),
                ],
              ),
            ),
          ),
        CustomPaint(
          size: Size(width, height),
          painter: _TrianglePinPainter(
            fillColor: const Color(0xFF34D399),
            borderColor: AppColors.deepForest,
          ),
          child: SizedBox(
            width: width,
            height: height,
            child: Center(
              child: Padding(
                padding: const EdgeInsets.only(top: 4.0),
                child: Icon(
                  Icons.recycling_rounded,
                  color: AppColors.deepForest,
                  size: isSelected ? 19 : 15,
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _TrianglePinPainter extends CustomPainter {
  final Color fillColor;
  final Color borderColor;

  _TrianglePinPainter({required this.fillColor, required this.borderColor});

  @override
  void paint(Canvas canvas, Size size) {
    final fillPaint = Paint()
      ..color = fillColor
      ..style = PaintingStyle.fill;

    final borderPaint = Paint()
      ..color = borderColor
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    final w = size.width;
    final h = size.height;

    // Equilateral triangle pointing up
    final path = Path()
      ..moveTo(w / 2, 2)
      ..lineTo(w - 2, h - 2)
      ..lineTo(2, h - 2)
      ..close();

    // Drop shadow
    canvas.drawShadow(path, Colors.black, 4, false);

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant _TrianglePinPainter oldDelegate) =>
      oldDelegate.fillColor != fillColor ||
      oldDelegate.borderColor != borderColor;
}

// ── User Location Marker (Dark dot on yellow road matching screenshot) ────────

class _UserLocationMarker extends StatelessWidget {
  final bool isLocating;
  final bool hasGps;

  const _UserLocationMarker({required this.isLocating, required this.hasGps});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 22,
      height: 22,
      decoration: BoxDecoration(
        color: AppColors.deepForest,
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 2.5),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha(80),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
    );
  }
}

class _WalkingPill extends StatelessWidget {
  final String label;
  final bool small;

  const _WalkingPill({required this.label, this.small = false});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: small ? 6 : 10,
        vertical: small ? 3 : 4,
      ),
      decoration: BoxDecoration(
        color: const Color(0xFFD1FAE5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            Icons.directions_walk_rounded,
            size: small ? 11 : 14,
            color: const Color(0xFF065F46),
          ),
          const SizedBox(width: 2),
          Text(
            label,
            style: AppTypography.badgeText.copyWith(
              color: const Color(0xFF065F46),
              fontSize: small ? 10 : 11,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  final bool isAvailable;

  const _StatusBadge({required this.isAvailable});

  @override
  Widget build(BuildContext context) {
    final color = isAvailable
        ? AppColors.primaryGreen
        : const Color(0xFFEF4444);
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          width: 6,
          height: 6,
          decoration: BoxDecoration(shape: BoxShape.circle, color: color),
        ),
        const SizedBox(width: 4),
        Text(
          isAvailable ? 'Available' : 'Unavailable',
          style: AppTypography.badgeText.copyWith(
            color: color,
            fontWeight: FontWeight.bold,
            fontSize: 11,
          ),
        ),
      ],
    );
  }
}
