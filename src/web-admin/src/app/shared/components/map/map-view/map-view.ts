import { Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '../../icon/icon';
import { Badge } from '../../badge/badge';

export interface MapMarker {
  id: string;
  label: string;
  x: number; // 0 to 100 percentage
  y: number; // 0 to 100 percentage
  status: 'online' | 'warning' | 'critical' | 'offline';
  type?: 'bin' | 'truck' | 'station';
  capacity?: number; // 0 - 100%
  battery?: number;
  lastUpdated?: string;
  address?: string;
}

@Component({
  selector: 'app-map-view',
  imports: [Icon, Badge],
  templateUrl: './map-view.html',
  styleUrl: './map-view.css',
})
export class MapView {
  readonly markers = input<MapMarker[]>([]);
  readonly title = input<string>('Live IoT Device Map');
  readonly selectedId = input<string | null>(null);
  readonly height = input<number>(380);

  readonly markerClicked = output<MapMarker>();

  readonly internalSelectedId = signal<string | null>(null);
  readonly zoom = signal<number>(1);

  readonly effectiveSelectedId = computed(() => {
    return this.internalSelectedId() || this.selectedId();
  });

  readonly activeMarker = computed(() => {
    const id = this.effectiveSelectedId();
    if (!id) return null;
    return this.markers().find((m) => m.id === id) || null;
  });

  selectMarker(marker: MapMarker, event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.internalSelectedId.set(marker.id);
    this.markerClicked.emit(marker);
  }

  clearSelection(): void {
    this.internalSelectedId.set(null);
  }

  zoomIn(): void {
    this.zoom.update((z) => Math.min(2.5, +(z + 0.25).toFixed(2)));
  }

  zoomOut(): void {
    this.zoom.update((z) => Math.max(0.75, +(z - 0.25).toFixed(2)));
  }

  resetZoom(): void {
    this.zoom.set(1);
  }

  getStatusColor(status: MapMarker['status']): string {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'critical':
        return '#ef4444';
      default:
        return '#94a3b8';
    }
  }

  getStatusBadge(status: MapMarker['status']): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (status) {
      case 'online':
        return 'success';
      case 'warning':
        return 'warning';
      case 'critical':
        return 'danger';
      default:
        return 'neutral';
    }
  }
}
