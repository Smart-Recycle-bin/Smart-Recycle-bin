import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type * as LeafletTypes from 'leaflet';
import { Icon } from '../../icon/icon';
import { Badge } from '../../badge/badge';
import { Button } from '../../button/button';

export type MapMarkerStatus = 'available' | 'warning' | 'critical' | 'offline';

export interface MapMarker {
  id: string;
  code?: string;
  label: string;
  lat: number;
  lng: number;
  status: MapMarkerStatus;
  type?: 'bin' | 'truck' | 'station';
  fillLevel?: number;
  capacity?: number;
  battery?: number;
  collector?: string;
  lastServiced?: string;
  lastUpdated?: string;
  address?: string;
}

@Component({
  selector: 'app-map-view',
  imports: [Icon, Badge, Button],
  templateUrl: './map-view.html',
  styleUrl: './map-view.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapView {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);

  readonly markers = input<MapMarker[]>([]);
  readonly title = input<string>('Live Bin Map');
  readonly selectedId = input<string | null>(null);
  readonly height = input<number>(420);
  readonly tileUrl = input<string>('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  readonly defaultCenter = input<[number, number]>([30.0444, 31.2357]);
  readonly defaultZoom = input<number>(12);

  readonly markerClicked = output<MapMarker>();
  readonly detailsClicked = output<MapMarker>();

  readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');

  readonly internalSelectedId = signal<string | null>(null);
  readonly mapReady = signal<boolean>(false);

  private leaflet: typeof LeafletTypes | null = null;
  private mapInstance: LeafletTypes.Map | null = null;
  private clusterGroup: LeafletTypes.LayerGroup | null = null;
  private leafletMarkers = new Map<string, LeafletTypes.Marker>();

  readonly effectiveSelectedId = computed(() => {
    return this.internalSelectedId() ?? this.selectedId();
  });

  readonly activeMarker = computed(() => {
    const id = this.effectiveSelectedId();
    if (!id) return null;
    return this.markers().find((m) => m.id === id) ?? null;
  });

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      afterNextRender(() => {
        void this.initLeaflet();
      });
    }

    effect(() => {
      const ready = this.mapReady();
      const markers = this.markers();
      const selected = this.effectiveSelectedId();
      if (ready) {
        this.syncMarkers(markers, selected);
      }
    });

    this.destroyRef.onDestroy(() => {
      this.mapInstance?.remove();
      this.mapInstance = null;
      this.clusterGroup = null;
      this.leafletMarkers.clear();
    });
  }

  selectMarker(marker: MapMarker): void {
    this.internalSelectedId.set(marker.id);
    this.markerClicked.emit(marker);
    if (this.mapInstance) {
      this.mapInstance.panTo([marker.lat, marker.lng], { animate: true });
    }
  }

  onViewDetails(marker: MapMarker): void {
    this.detailsClicked.emit(marker);
  }

  clearSelection(): void {
    this.internalSelectedId.set(null);
  }

  zoomIn(): void {
    this.mapInstance?.zoomIn();
  }

  zoomOut(): void {
    this.mapInstance?.zoomOut();
  }

  fitBounds(): void {
    const list = this.markers();
    if (!this.mapInstance || !this.leaflet) return;
    if (list.length === 0) {
      this.mapInstance.setView(this.defaultCenter(), this.defaultZoom());
      return;
    }
    const bounds = this.leaflet.latLngBounds(list.map((m) => [m.lat, m.lng] as [number, number]));
    this.mapInstance.fitBounds(bounds.pad(0.18), { maxZoom: 15 });
  }

  getMarkerFill(marker: MapMarker): number | null {
    return marker.fillLevel ?? marker.capacity ?? null;
  }

  getStatusColor(status: MapMarkerStatus): string {
    switch (status) {
      case 'available':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  }

  getStatusLabel(status: MapMarkerStatus): string {
    switch (status) {
      case 'available':
        return 'Available';
      case 'warning':
        return 'Warning';
      case 'critical':
        return 'Critical';
      default:
        return 'Offline';
    }
  }

  getStatusBadge(status: MapMarkerStatus): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'available':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  private async initLeaflet(): Promise<void> {
    const hostEl = this.mapHost()?.nativeElement;
    if (!hostEl || this.mapInstance) return;

    try {
      const leafletMod = await import('leaflet');
      const L = ((leafletMod as { default?: typeof LeafletTypes }).default ??
        leafletMod) as typeof LeafletTypes;
      (globalThis as Record<string, unknown>)['L'] = L;
      await import('leaflet.markercluster');

      this.leaflet = L;
      const map = L.map(hostEl, {
        center: this.defaultCenter(),
        zoom: this.defaultZoom(),
        zoomControl: false,
      });

      L.tileLayer(this.tileUrl(), {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      map.on('click', () => {
        this.clearSelection();
      });

      const maybeCluster = (
        L as unknown as {
          markerClusterGroup?: (opts: Record<string, unknown>) => LeafletTypes.LayerGroup;
        }
      ).markerClusterGroup;

      const group =
        typeof maybeCluster === 'function'
          ? maybeCluster({
              showCoverageOnHover: false,
              maxClusterRadius: 42,
              iconCreateFunction: (cluster: { getChildCount: () => number }) =>
                L.divIcon({
                  html: `<div class="ecobin-cluster-badge">${cluster.getChildCount()}</div>`,
                  className: 'ecobin-cluster-icon',
                  iconSize: L.point(34, 34),
                }),
            })
          : L.layerGroup();

      group.addTo(map);
      this.mapInstance = map;
      this.clusterGroup = group;
      this.mapReady.set(true);
      this.fitBounds();
    } catch {
      this.mapReady.set(false);
    }
  }

  private syncMarkers(markers: MapMarker[], selectedId: string | null): void {
    const L = this.leaflet;
    const group = this.clusterGroup;
    if (!L || !group) return;

    group.clearLayers();
    this.leafletMarkers.clear();

    for (const marker of markers) {
      const isSelected = marker.id === selectedId;
      const color = this.getStatusColor(marker.status);
      const classes = [
        'ecobin-marker-pin',
        isSelected ? 'is-selected' : '',
        marker.status === 'critical' ? 'is-critical' : '',
      ]
        .filter(Boolean)
        .join(' ');

      const icon = L.divIcon({
        html: `<div class="${classes}" style="background-color:${color}" title="${this.escapeHtml(marker.label)}"></div>`,
        className: 'ecobin-marker-wrapper',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      const leafMarker = L.marker([marker.lat, marker.lng], { icon });
      leafMarker.on('click', (e: LeafletTypes.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        this.selectMarker(marker);
      });

      this.leafletMarkers.set(marker.id, leafMarker);
      group.addLayer(leafMarker);
    }
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }
}
