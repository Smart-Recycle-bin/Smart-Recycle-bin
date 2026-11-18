import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BinMapItem, BinMapQuery } from '@models/bin/bin-map.model';
import { BinStatus, BIN_STATUS_LABELS } from '@models/bin/bin-status.enum';
import { BIN_LIVE_FEED } from '@services/bin/bin-live-feed.interface';
import { PollingBinLiveFeed } from '@services/bin/polling-bin-live-feed.service';
import { sanitizeMapBins } from './utils/bin-map-sanitizer';
import { diffBins } from './utils/bin-diff';
import { BinMapCanvas } from './components/bin-map-canvas/bin-map-canvas';
import { BinDetailCard } from './components/bin-detail-card/bin-detail-card';
import { Icon } from '@shared/components/icon/icon';

export interface StatusFilterOption {
  status: BinStatus;
  label: string;
  cssClass: string;
}

@Component({
  selector: 'app-live-bin-map',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BinMapCanvas,
    BinDetailCard,
    Icon,
  ],
  providers: [
    {
      provide: BIN_LIVE_FEED,
      useClass: PollingBinLiveFeed,
    },
  ],
  templateUrl: './live-bin-map.html',
  styleUrl: './live-bin-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LiveBinMap implements OnInit {
  private readonly liveFeed = inject(BIN_LIVE_FEED);
  private readonly destroyRef = inject(DestroyRef);

  readonly mapCanvas = viewChild<BinMapCanvas>('mapCanvas');
  readonly binListContainer = viewChild<ElementRef<HTMLElement>>('binListContainer');

  // Raw bin items and metadata from feed
  readonly allBins = signal<BinMapItem[]>([]);
  readonly isTruncated = signal<boolean>(false);
  readonly selectedBinId = signal<string | null>(null);

  // Active region tab
  readonly activeRegion = signal<string>('');

  // Status checkboxes state
  readonly statusFilters = signal<Record<BinStatus, boolean>>({
    [BinStatus.Available]: true,
    [BinStatus.EightyPercentFull]: true,
    [BinStatus.NeedsServicing]: true,
    [BinStatus.Offline]: true,
  });

  // Mobile collapsed panel toggle
  readonly mobilePanelExpanded = signal<boolean>(false);

  // Announcements for aria-live (capped at 3 per update)
  readonly announcements = signal<string[]>([]);

  // Freshness calculation
  readonly currentTime = signal<number>(Date.now());
  private timeTicker: ReturnType<typeof setInterval> | null = null;
  private bboxDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBbox: string | null = null;

  readonly statusOptions: StatusFilterOption[] = [
    {
      status: BinStatus.Available,
      label: 'Available',
      cssClass: 'status-dot-available',
    },
    {
      status: BinStatus.EightyPercentFull,
      label: '≥80% full',
      cssClass: 'status-dot-warning',
    },
    {
      status: BinStatus.NeedsServicing,
      label: '≥95% – needs servicing',
      cssClass: 'status-dot-danger',
    },
    {
      status: BinStatus.Offline,
      label: 'Offline',
      cssClass: 'status-dot-offline',
    },
  ];

  /**
   * Available regions dynamically derived from the returned data.
   */
  readonly availableRegions = computed<string[]>(() => {
    const bins = this.allBins();
    const regionsSet = new Set<string>();
    for (const b of bins) {
      if (b.region && b.region.trim().length > 0) {
        regionsSet.add(b.region.trim());
      }
    }
    return Array.from(regionsSet).sort();
  });

  /**
   * Status counts for the currently ACTIVE REGION, regardless of checkbox states.
   * "Counts reflect the active region regardless of the checkboxes."
   */
  readonly regionStatusCounts = computed<Record<BinStatus, number>>(() => {
    const bins = this.allBins();
    const region = this.activeRegion();

    const counts: Record<BinStatus, number> = {
      [BinStatus.Available]: 0,
      [BinStatus.EightyPercentFull]: 0,
      [BinStatus.NeedsServicing]: 0,
      [BinStatus.Offline]: 0,
    };

    for (const bin of bins) {
      const matchesRegion =
        !region ||
        bin.region.toLowerCase() === region.toLowerCase() ||
        bin.district.toLowerCase() === region.toLowerCase();

      if (matchesRegion) {
        if (bin.status in counts) {
          counts[bin.status as BinStatus]++;
        } else {
          counts[BinStatus.Offline]++;
        }
      }
    }

    return counts;
  });

  /**
   * Total bins count in active region.
   */
  readonly totalBinsInRegion = computed<number>(() => {
    const counts = this.regionStatusCounts();
    return (
      counts[BinStatus.Available] +
      counts[BinStatus.EightyPercentFull] +
      counts[BinStatus.NeedsServicing] +
      counts[BinStatus.Offline]
    );
  });

  /**
   * Filtered bins displayed in list and map (matching active region AND checked statuses).
   */
  readonly displayedBins = computed<BinMapItem[]>(() => {
    const bins = this.allBins();
    const region = this.activeRegion();
    const filters = this.statusFilters();

    return bins.filter((bin) => {
      const regionMatch =
        !region ||
        bin.region.toLowerCase() === region.toLowerCase() ||
        bin.district.toLowerCase() === region.toLowerCase();

      const statusMatch = !!filters[bin.status as BinStatus];
      return regionMatch && statusMatch;
    });
  });

  /**
   * Set of currently allowed statuses for map canvas filter synchronization.
   */
  readonly allowedStatusesSet = computed<Set<string>>(() => {
    const filters = this.statusFilters();
    const allowed = new Set<string>();
    for (const [st, isChecked] of Object.entries(filters)) {
      if (isChecked) allowed.add(st);
    }
    return allowed;
  });

  /**
   * Selected bin item object for details card.
   */
  readonly selectedBin = computed<BinMapItem | null>(() => {
    const id = this.selectedBinId();
    if (!id) return null;
    return this.allBins().find((b) => b.binId === id) ?? null;
  });

  /**
   * Subtitle text e.g. "16 of 16 bins shown".
   */
  readonly subtitleText = computed<string>(() => {
    const shown = this.displayedBins().length;
    const total = this.totalBinsInRegion();
    return `${shown} of ${total} bins shown`;
  });

  /**
   * Freshness chip status and label.
   */
  readonly freshnessChip = computed<{ text: string; variant: 'live' | 'stale' | 'paused' | 'error' }>(() => {
    const feedStatus = this.liveFeed.status();
    const lastUpdate = this.liveFeed.lastUpdatedAt();
    const now = this.currentTime();

    if (feedStatus === 'stale') {
      return { text: 'Stale — retrying', variant: 'stale' };
    }
    if (feedStatus === 'paused') {
      return { text: 'Paused (tab hidden)', variant: 'paused' };
    }
    if (feedStatus === 'error') {
      return { text: 'Error — retrying', variant: 'error' };
    }

    if (!lastUpdate) {
      return { text: 'Updating...', variant: 'live' };
    }

    const elapsedSeconds = Math.max(0, Math.floor((now - lastUpdate.getTime()) / 1000));
    if (elapsedSeconds < 5) {
      return { text: 'Just now', variant: 'live' };
    }
    if (elapsedSeconds < 60) {
      return { text: `Updated ${elapsedSeconds}s ago`, variant: 'live' };
    }
    return { text: `Updated ${Math.floor(elapsedSeconds / 60)}m ago`, variant: 'live' };
  });

  ngOnInit(): void {
    this.startFeed();
    this.startTimeTicker();
  }

  private startFeed(): void {
    // Subscribe to feed updates
    this.destroyRef.onDestroy(() => {
      this.liveFeed.stop();
      if (this.timeTicker) {
        clearInterval(this.timeTicker);
        this.timeTicker = null;
      }
      if (this.bboxDebounceTimer) {
        clearTimeout(this.bboxDebounceTimer);
        this.bboxDebounceTimer = null;
      }
    });

    this.liveFeed.updates$.subscribe((response) => {
      const sanitized = sanitizeMapBins(response.items);
      const prev = this.allBins();
      const next = sanitized.items;

      // Detect status changes and announce (capped at 3)
      this.processAnnouncements(prev, next);

      this.allBins.set(next);
      this.isTruncated.set(response.meta.truncated);

      // Auto-initialize activeRegion to first region if empty
      if (!this.activeRegion() && next.length > 0) {
        const firstRegion = next.find((b) => b.region)?.region ?? '';
        if (firstRegion) {
          this.activeRegion.set(firstRegion);
        }
      }
    });

    // Start polling with current query parameters
    this.liveFeed.start(() => this.buildCurrentQuery());
  }

  private buildCurrentQuery(): BinMapQuery {
    const q: BinMapQuery = {};
    if (this.activeRegion()) {
      q.region = this.activeRegion();
    }
    if (this.lastBbox && this.isTruncated()) {
      q.bbox = this.lastBbox;
    }
    return q;
  }

  private processAnnouncements(prev: BinMapItem[], next: BinMapItem[]): void {
    if (prev.length === 0) return;

    const diff = diffBins(prev, next);
    const messages: string[] = [];

    for (const change of diff.changed) {
      const changedBin = change.item;
      const oldBin = prev.find((b) => b.binId === changedBin.binId);
      if (oldBin && oldBin.status !== changedBin.status) {
        const statusLabel = BIN_STATUS_LABELS[changedBin.status as BinStatus] ?? changedBin.status;
        messages.push(`${changedBin.binId} is now ${statusLabel}`);
      }
    }

    // Cap announcements at maximum 3 per refresh
    this.announcements.set(messages.slice(0, 3));
  }

  private startTimeTicker(): void {
    this.timeTicker = setInterval(() => {
      this.currentTime.set(Date.now());
    }, 1000);
  }

  onRegionTabClick(region: string): void {
    if (this.activeRegion() === region) return;
    this.activeRegion.set(region);

    // Fit map bounds on region change
    setTimeout(() => {
      this.mapCanvas()?.fitBoundsToVisible();
    }, 50);
  }

  onStatusFilterToggle(status: BinStatus): void {
    this.statusFilters.update((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  }

  onBinSelect(binId: string): void {
    this.selectedBinId.set(binId);

    // Scroll list item into view
    setTimeout(() => {
      const container = this.binListContainer()?.nativeElement;
      if (container) {
        const target = container.querySelector(`[data-bin-id="${binId}"]`);
        if (target && typeof target.scrollIntoView === 'function') {
          target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
      }
      this.mapCanvas()?.panToBin(binId);
    }, 20);
  }

  onClearSelection(): void {
    this.selectedBinId.set(null);
  }

  onResetView(): void {
    this.mapCanvas()?.fitBoundsToVisible();
  }

  onRefreshNow(): void {
    this.liveFeed.refreshNow();
  }

  onMapBoundsChanged(bbox: string): void {
    this.lastBbox = bbox;

    // If truncated, refetch with visible bbox on map idle (debounced 500 ms)
    if (this.isTruncated()) {
      if (this.bboxDebounceTimer) {
        clearTimeout(this.bboxDebounceTimer);
      }
      this.bboxDebounceTimer = setTimeout(() => {
        this.liveFeed.refreshNow();
      }, 500);
    }
  }

  toggleMobilePanel(): void {
    this.mobilePanelExpanded.update((v) => !v);
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    this.onClearSelection();
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case BinStatus.Available:
        return 'status-dot-available';
      case BinStatus.EightyPercentFull:
        return 'status-dot-warning';
      case BinStatus.NeedsServicing:
        return 'status-dot-danger';
      case BinStatus.Offline:
      default:
        return 'status-dot-offline';
    }
  }
}
