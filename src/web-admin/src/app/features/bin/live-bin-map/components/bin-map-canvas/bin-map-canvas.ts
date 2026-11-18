import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  OnDestroy,
  OnInit,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleMap, GoogleMapsModule } from '@angular/google-maps';
import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { GoogleMapsLoaderService, GoogleMapsLoaderState } from '@services/maps/google-maps-loader.service';
import { MapLoadBudgetService } from '@services/maps/map-load-budget.service';
import { AppConfigService } from '@services/config/app-config.service';
import { ThemeService } from '@services/theme/theme.service';
import { MapUnavailable, MapUnavailableVariant } from '@shared/components/map/map-unavailable/map-unavailable';
import { diffBins } from '@features/bin/live-bin-map/utils/bin-diff';
import { BinClusterRenderer, getStatusSeverity } from '@features/bin/live-bin-map/utils/bin-cluster-renderer';
import {
  createBinMarkerElement,
  updateBinMarkerElement,
  buildAccessibleTitle,
} from '@features/bin/live-bin-map/utils/bin-marker-element';

export interface MarkerRecord {
  bin: BinMapItem;
  marker: google.maps.marker.AdvancedMarkerElement;
  element: HTMLElement;
}

@Component({
  selector: 'app-bin-map-canvas',
  standalone: true,
  imports: [CommonModule, GoogleMapsModule, MapUnavailable],
  templateUrl: './bin-map-canvas.html',
  styleUrl: './bin-map-canvas.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class BinMapCanvas implements OnInit, OnDestroy {
  readonly googleMapComponent = viewChild<GoogleMap>('googleMapComponent');

  readonly bins = input<BinMapItem[]>([]);
  readonly selectedBinId = input<string | null>(null);
  readonly activeRegion = input<string>('All');
  readonly allowedStatuses = input<Set<string>>(new Set());

  readonly binSelected = output<string>();
  readonly emptyMapClicked = output<void>();
  readonly boundsChanged = output<string>(); // bbox formatted as south,west,north,east

  private readonly loaderService = inject(GoogleMapsLoaderService);
  private readonly budgetService = inject(MapLoadBudgetService);
  private readonly configService = inject(AppConfigService);
  private readonly themeService = inject(ThemeService);
  private readonly ngZone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  readonly loaderState = signal<GoogleMapsLoaderState>('idle');
  readonly hasBudget = signal<boolean>(true);
  readonly unavailableVariant = signal<MapUnavailableVariant | null>(null);
  readonly tilesLoaded = signal<boolean>(false);
  readonly showTilesWarning = signal<boolean>(false);
  readonly currentZoom = signal<number>(12);
  readonly labelsVisible = computed(() => this.currentZoom() >= 14);

  // Map state preservation across theme recreations
  private savedCenter: { lat: number; lng: number } | null = null;
  private savedZoom: number | null = null;

  // Single map instance lifecycle
  readonly mapKey = signal<number>(1);
  readonly mapRendered = signal<boolean>(true);
  private googleMapInstance: google.maps.Map | null = null;
  private tilesTimer: ReturnType<typeof setTimeout> | null = null;
  private themeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastTheme: string | null = null;
  private isFirstThemeRun = true;

  // Markers storage and diff tracking
  private markerRecords = new Map<string, MarkerRecord>();
  private previousBins: BinMapItem[] = [];
  readonly clusterRenderer = new BinClusterRenderer();

  // Egypt restriction bounds
  static readonly EGYPT_BOUNDS = {
    north: 32.0,
    south: 21.5,
    west: 24.5,
    east: 37.0,
  };

  readonly mapOptions = computed<google.maps.MapOptions>(() => {
    const isDark = this.themeService.theme() === 'dark';
    const config = this.configService.getConfig();

    const colorSchemeVal =
      typeof google !== 'undefined' && google.maps?.ColorScheme
        ? isDark
          ? google.maps.ColorScheme.DARK
          : google.maps.ColorScheme.LIGHT
        : isDark
          ? 'DARK'
          : 'LIGHT';

    return {
      mapId: config?.googleMaps?.mapId || 'DEMO_MAP_ID',
      colorScheme: colorSchemeVal as unknown as google.maps.ColorScheme,
      center: this.savedCenter ?? { lat: 30.0444, lng: 31.2357 }, // Cairo center
      zoom: this.savedZoom ?? 12,
      minZoom: 6,
      maxZoom: 19,
      disableDefaultUI: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      gestureHandling: 'greedy',
      clickableIcons: false,
      restriction: {
        latLngBounds: BinMapCanvas.EGYPT_BOUNDS,
        strictBounds: false,
      },
    };
  });

  constructor() {
    // Monitor theme changes for map recreation (colorScheme is init-only)
    effect(() => {
      const currentTheme = this.themeService.theme();
      if (this.isFirstThemeRun) {
        this.isFirstThemeRun = false;
        this.lastTheme = currentTheme;
        return;
      }

      if (this.lastTheme !== currentTheme) {
        this.lastTheme = currentTheme;
        this.scheduleThemeRecreation();
      }
    });

    // Monitor bins changes and apply in-place diff
    effect(() => {
      const currentBins = this.bins();
      this.applyBinsDiff(currentBins);
    });

    // Monitor filters (region and statuses) to show/hide markers without recreation
    effect(() => {
      this.activeRegion();
      this.allowedStatuses();
      this.syncMarkerVisibilities();
    });

    // Monitor selection to update marker styling
    effect(() => {
      const selectedId = this.selectedBinId();
      this.updateSelectionHighlights(selectedId);
    });
  }

  async ngOnInit(): Promise<void> {
    await this.initializeMapFlow();
  }

  async initializeMapFlow(): Promise<void> {
    // Check budget
    if (!this.budgetService.allow()) {
      this.hasBudget.set(false);
      this.unavailableVariant.set('budget-exceeded');
      return;
    }

    // Trigger loader
    try {
      await this.loaderService.load();
      const st = this.loaderService.state();
      this.loaderState.set(st);

      if (st === 'ready') {
        this.hasBudget.set(true);
        this.unavailableVariant.set(null);
      } else if (
        st === 'not-configured' ||
        st === 'auth-failed' ||
        st === 'network-error' ||
        st === 'timeout'
      ) {
        this.unavailableVariant.set(st);
      }
    } catch {
      this.unavailableVariant.set('network-error');
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.googleMapInstance = map;
    this.budgetService.recordInit();

    const initialZoom = map.getZoom();
    if (typeof initialZoom === 'number') {
      this.currentZoom.set(initialZoom);
    }
    map.addListener('zoom_changed', () => {
      const nextZoom = map.getZoom();
      if (typeof nextZoom === 'number') {
        this.ngZone.run(() => {
          this.currentZoom.set(nextZoom);
        });
      }
    });

    // Start 10s tilesloaded watchdog
    this.tilesLoaded.set(false);
    this.showTilesWarning.set(false);
    if (this.tilesTimer) {
      clearTimeout(this.tilesTimer);
    }
    this.tilesTimer = setTimeout(() => {
      if (!this.tilesLoaded()) {
        this.showTilesWarning.set(true);
      }
    }, 10000);

    // Initial render of existing markers
    this.renderAllMarkers(this.bins());
    this.fitBoundsToVisible();
  }

  onTilesLoaded(): void {
    this.tilesLoaded.set(true);
    this.showTilesWarning.set(false);
    if (this.tilesTimer) {
      clearTimeout(this.tilesTimer);
      this.tilesTimer = null;
    }
  }

  onMapClick(): void {
    this.emptyMapClicked.emit();
  }

  onMapIdle(): void {
    if (!this.googleMapInstance) return;

    // Capture center and zoom for preservation
    const c = this.googleMapInstance.getCenter();
    if (c) {
      this.savedCenter = {
        lat: typeof c.lat === 'function' ? c.lat() : (c as unknown as { lat: number }).lat,
        lng: typeof c.lng === 'function' ? c.lng() : (c as unknown as { lng: number }).lng,
      };
    }
    const z = this.googleMapInstance.getZoom();
    if (typeof z === 'number') {
      this.savedZoom = z;
      if (this.currentZoom() !== z) {
        this.currentZoom.set(z);
      }
    }

    // Emit bounding box string for truncated refetches
    const bounds = this.googleMapInstance.getBounds();
    if (bounds) {
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      const south = typeof sw.lat === 'function' ? sw.lat() : (sw as unknown as { lat: number }).lat;
      const west = typeof sw.lng === 'function' ? sw.lng() : (sw as unknown as { lng: number }).lng;
      const north = typeof ne.lat === 'function' ? ne.lat() : (ne as unknown as { lat: number }).lat;
      const east = typeof ne.lng === 'function' ? ne.lng() : (ne as unknown as { lng: number }).lng;
      const bbox = `${south.toFixed(5)},${west.toFixed(5)},${north.toFixed(5)},${east.toFixed(5)}`;
      this.boundsChanged.emit(bbox);
    }
  }

  /**
   * Recreates the Google Map instance on theme change (colorScheme is init-only).
   * Preserves center, zoom, selected bin, and shown filters, debounced by 400ms.
   */
  private scheduleThemeRecreation(): void {
    if (this.themeDebounceTimer) {
      clearTimeout(this.themeDebounceTimer);
    }

    this.themeDebounceTimer = setTimeout(() => {
      this.recreateMapInstance();
    }, 400);
  }

  private recreateMapInstance(): void {
    if (!this.budgetService.allow()) {
      this.hasBudget.set(false);
      this.unavailableVariant.set('budget-exceeded');
      return;
    }

    // Teardown existing markers from old map
    for (const record of this.markerRecords.values()) {
      if (record.marker) {
        record.marker.map = null;
      }
    }
    this.markerRecords.clear();
    this.previousBins = [];

    // Trigger Angular to unmount and recreate the google-map element
    this.mapRendered.set(false);
    this.mapKey.update((k) => k + 1);
    setTimeout(() => {
      this.mapRendered.set(true);
    }, 0);
  }

  /**
   * Applies diff-based updates to markers without recreating all elements.
   */
  private applyBinsDiff(nextBins: BinMapItem[]): void {
    if (!this.googleMapInstance) {
      this.previousBins = [...nextBins];
      return;
    }

    const diff = diffBins(this.previousBins, nextBins);
    this.previousBins = [...nextBins];

    // 1. Remove markers
    for (const bin of diff.removed) {
      const record = this.markerRecords.get(bin.binId);
      if (record) {
        record.marker.map = null;
        this.markerRecords.delete(bin.binId);
      }
    }

    // 2. Add new markers
    for (const bin of diff.added) {
      this.createMarkerForBin(bin);
    }

    // 3. Update changed markers in place (constructor count constant!)
    for (const change of diff.changed) {
      const bin = change.item;
      const record = this.markerRecords.get(bin.binId);
      if (record) {
        record.bin = bin;
        record.marker.position = { lat: bin.latitude, lng: bin.longitude };
        this.updateMarkerElement(record.element, bin);
      }
    }

    this.syncMarkerVisibilities();
  }

  private renderAllMarkers(bins: BinMapItem[]): void {
    if (!this.googleMapInstance) return;

    for (const bin of bins) {
      if (!this.markerRecords.has(bin.binId)) {
        this.createMarkerForBin(bin);
      }
    }
    this.syncMarkerVisibilities();
  }

  private createMarkerForBin(bin: BinMapItem): void {
    if (!this.googleMapInstance) return;

    const el = createBinMarkerElement(bin, {
      selected: this.selectedBinId() === bin.binId,
      onSelect: (binId) => {
        this.ngZone.run(() => {
          this.selectBin(binId);
        });
      },
    });

    const title = buildAccessibleTitle(bin);

    let markerInstance: google.maps.marker.AdvancedMarkerElement;
    if (
      typeof google !== 'undefined' &&
      google.maps?.marker?.AdvancedMarkerElement
    ) {
      markerInstance = new google.maps.marker.AdvancedMarkerElement({
        map: this.googleMapInstance,
        position: { lat: bin.latitude, lng: bin.longitude },
        content: el,
        title,
      });
      (markerInstance as unknown as { _binStatus: string })._binStatus = bin.status;
      (markerInstance as unknown as { _binItem: BinMapItem })._binItem = bin;
    } else {
      // Stub fallback
      markerInstance = {
        map: this.googleMapInstance,
        position: { lat: bin.latitude, lng: bin.longitude },
        content: el,
        title,
      } as unknown as google.maps.marker.AdvancedMarkerElement;
    }

    this.markerRecords.set(bin.binId, {
      bin,
      marker: markerInstance,
      element: el,
    });
  }

  private updateMarkerElement(el: HTMLElement, bin: BinMapItem): void {
    updateBinMarkerElement(el, bin, {
      selected: this.selectedBinId() === bin.binId,
    });
  }

  private selectBin(binId: string): void {
    this.binSelected.emit(binId);
    this.panToBin(binId);
  }

  panToBin(binId: string): void {
    const record = this.markerRecords.get(binId);
    if (record && this.googleMapInstance) {
      const pos = {
        lat: record.bin.latitude,
        lng: record.bin.longitude,
      };
      if (typeof this.googleMapInstance.panTo === 'function') {
        this.googleMapInstance.panTo(pos);
      } else if (typeof this.googleMapInstance.setCenter === 'function') {
        this.googleMapInstance.setCenter(pos);
      }
    }
  }

  private updateSelectionHighlights(selectedId: string | null): void {
    for (const [id, record] of this.markerRecords.entries()) {
      const isSelected = id === selectedId;
      if (isSelected) {
        record.element.classList.add('marker-selected');
        if (record.marker) {
          record.marker.zIndex = 1000;
        }
      } else {
        record.element.classList.remove('marker-selected');
        if (record.marker) {
          record.marker.zIndex = 1;
        }
      }
    }
  }

  private syncMarkerVisibilities(): void {
    const region = this.activeRegion();
    const statuses = this.allowedStatuses();

    for (const record of this.markerRecords.values()) {
      const bin = record.bin;
      const regionMatch =
        region === 'All' ||
        bin.region.toLowerCase() === region.toLowerCase() ||
        bin.district.toLowerCase() === region.toLowerCase();

      const statusMatch =
        statuses.size === 0 || statuses.has(bin.status);

      const isVisible = regionMatch && statusMatch;
      if (record.marker) {
        record.marker.map = isVisible ? this.googleMapInstance : null;
      }
      record.element.style.display = isVisible ? '' : 'none';
    }
  }

  /**
   * Fits the map viewport bounds to the active set of visible markers.
   */
  fitBoundsToVisible(): void {
    if (!this.googleMapInstance) return;

    const visiblePoints: { lat: number; lng: number }[] = [];
    for (const record of this.markerRecords.values()) {
      if (record.marker && record.marker.map !== null) {
        visiblePoints.push({
          lat: record.bin.latitude,
          lng: record.bin.longitude,
        });
      }
    }

    if (visiblePoints.length === 0) return;

    if (visiblePoints.length === 1) {
      this.googleMapInstance.setCenter(visiblePoints[0]);
      this.googleMapInstance.setZoom(16); // maxZoom 16 for single marker
      return;
    }

    if (typeof google !== 'undefined' && google.maps?.LatLngBounds) {
      const bounds = new google.maps.LatLngBounds();
      for (const p of visiblePoints) {
        bounds.extend(p);
      }
      this.googleMapInstance.fitBounds(bounds, 48); // 48px padding
    }
  }

  onRetry(): void {
    this.initializeMapFlow();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.emptyMapClicked.emit();
  }

  ngOnDestroy(): void {
    if (this.tilesTimer) {
      clearTimeout(this.tilesTimer);
      this.tilesTimer = null;
    }
    if (this.themeDebounceTimer) {
      clearTimeout(this.themeDebounceTimer);
      this.themeDebounceTimer = null;
    }
    for (const record of this.markerRecords.values()) {
      if (record.marker) {
        record.marker.map = null;
      }
    }
    this.markerRecords.clear();
  }
}
