/// <reference types="@types/google.maps" />
import { BinStatus } from '@models/bin/bin-status.enum';

export type StatusSeverity = 'danger' | 'warning' | 'neutral' | 'success';

export const STATUS_SEVERITY_ORDER: Record<string, number> = {
  [BinStatus.NeedsServicing]: 4,
  '≥95% FULL': 4,
  [BinStatus.EightyPercentFull]: 3,
  '80%': 3,
  [BinStatus.Offline]: 2,
  'OFFLINE': 2,
  [BinStatus.Available]: 1,
};

/**
 * Calculates the worst status among a collection of bin statuses.
 * Severity hierarchy:
 * 1. NeedsServicing (≥95% full) - Danger (red)
 * 2. EightyPercentFull (≥80% full) - Warning (amber)
 * 3. Offline - Neutral (gray)
 * 4. Available - Success (green)
 */
export function getWorstStatus(statuses: string[]): BinStatus {
  if (!statuses || statuses.length === 0) {
    return BinStatus.Available;
  }

  let worstRank = 0;
  let worstStatus: BinStatus = BinStatus.Available;

  for (const s of statuses) {
    const rank = STATUS_SEVERITY_ORDER[s] ?? 0;
    if (rank > worstRank) {
      worstRank = rank;
      if (rank === 4) worstStatus = BinStatus.NeedsServicing;
      else if (rank === 3) worstStatus = BinStatus.EightyPercentFull;
      else if (rank === 2) worstStatus = BinStatus.Offline;
      else worstStatus = BinStatus.Available;
    }
  }

  return worstStatus;
}

export function getStatusSeverity(status: string): StatusSeverity {
  const rank = STATUS_SEVERITY_ORDER[status] ?? 1;
  switch (rank) {
    case 4:
      return 'danger';
    case 3:
      return 'warning';
    case 2:
      return 'neutral';
    case 1:
    default:
      return 'success';
  }
}

export interface ClusterMarkerLike {
  count: number;
  position: google.maps.LatLng | { lat: number; lng: number };
  markers?: Array<{
    _binStatus?: string;
    status?: string;
    title?: string;
  }>;
}

/**
 * Custom cluster renderer that renders a cluster marker whose color represents
 * the WORST operational status inside the cluster and displays the count.
 */
export class BinClusterRenderer {
  render(cluster: ClusterMarkerLike): HTMLElement | google.maps.marker.AdvancedMarkerElement {
    const count = cluster.count || (cluster.markers ? cluster.markers.length : 1);
    const markers = cluster.markers ?? [];
    const statuses = markers
      .map((m) => m._binStatus || m.status || '')
      .filter((s) => s.length > 0);

    const worstStatus = getWorstStatus(statuses);
    const severity = getStatusSeverity(worstStatus);

    // Build DOM element safely using createElement and textContent (never innerHTML)
    const container = document.createElement('div');
    container.className = `bin-cluster-pin cluster-${severity}`;
    container.setAttribute('role', 'button');
    container.setAttribute('tabindex', '0');
    container.setAttribute(
      'aria-label',
      `Cluster of ${count} smart bins, most critical status: ${worstStatus}`
    );

    const countEl = document.createElement('span');
    countEl.className = 'bin-cluster-count';
    countEl.textContent = String(count);
    container.appendChild(countEl);

    // Return AdvancedMarkerElement if available in google.maps.marker
    if (
      typeof google !== 'undefined' &&
      google.maps?.marker?.AdvancedMarkerElement
    ) {
      return new google.maps.marker.AdvancedMarkerElement({
        position: cluster.position,
        content: container,
        title: `Cluster (${count} bins)`,
      });
    }

    // In unit test stubs or environments where AdvancedMarkerElement is not direct
    return container as unknown as google.maps.marker.AdvancedMarkerElement;
  }
}
