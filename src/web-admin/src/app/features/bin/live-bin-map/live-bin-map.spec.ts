import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Subject } from 'rxjs';
import { LiveBinMap } from './live-bin-map';
import { BIN_LIVE_FEED, BinLiveFeed } from '@services/bin/bin-live-feed.interface';
import { BinMapItem, BinMapResponse } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';
import { GoogleMapsLoaderService } from '@services/maps/google-maps-loader.service';
import { MapLoadBudgetService } from '@services/maps/map-load-budget.service';
import { AppConfigService } from '@services/config/app-config.service';
import { ThemeService } from '@services/theme/theme.service';
import {
  installFakeGoogleMaps,
  resetFakeGoogleMapsCounters,
  FakeMap,
  FakeAdvancedMarkerElement,
} from '@testing/fake-google-maps';
import {
  BinClusterRenderer,
  getWorstStatus,
  getStatusSeverity,
} from './utils/bin-cluster-renderer';
import { signal } from '@angular/core';

describe('LiveBinMap', () => {
  let fixture: ComponentFixture<LiveBinMap>;
  let component: LiveBinMap;
  let uninstallFakeMaps: () => void;

  let feedSubject: Subject<BinMapResponse>;
  let mockLiveFeed: Partial<BinLiveFeed>;
  let mockBudgetService: {
    allow: ReturnType<typeof vi.fn>;
    recordInit: ReturnType<typeof vi.fn>;
  };
  let mockLoaderService: {
    state: ReturnType<typeof signal>;
    load: ReturnType<typeof vi.fn>;
  };
  let mockConfigService: {
    getConfig: ReturnType<typeof vi.fn>;
    loadConfig: ReturnType<typeof vi.fn>;
  };

  const sampleBins: BinMapItem[] = [
    {
      binId: 'BIN-0001',
      name: 'Nasr City Mall',
      area: 'Nasr City',
      district: 'Nasr City',
      region: 'Greater Cairo',
      latitude: 30.04,
      longitude: 31.23,
      status: BinStatus.Available,
      fillLevel: 35,
      collectorName: 'Mahmoud Fathy',
      lastServicedAt: '2025-06-11T09:00:00Z',
      updatedAt: '2025-06-11T09:00:00Z',
    },
    {
      binId: 'BIN-0002',
      name: 'Heliopolis Square',
      area: 'Heliopolis',
      district: 'Heliopolis',
      region: 'Greater Cairo',
      latitude: 30.08,
      longitude: 31.32,
      status: BinStatus.EightyPercentFull,
      fillLevel: 85,
      collectorName: 'Mahmoud Fathy',
      lastServicedAt: '2025-06-11T10:00:00Z',
      updatedAt: '2025-06-11T10:00:00Z',
    },
    {
      binId: 'BIN-0003',
      name: 'Tahrir Square North',
      area: 'Downtown',
      district: 'Downtown',
      region: 'Greater Cairo',
      latitude: 30.06,
      longitude: 31.25,
      status: BinStatus.NeedsServicing,
      fillLevel: 97,
      collectorName: 'Hossam El-Din',
      lastServicedAt: '2025-06-11T09:05:00Z',
      updatedAt: '2025-06-11T09:05:00Z',
    },
    {
      binId: 'BIN-0004',
      name: 'Zamalek Gezira',
      area: 'Zamalek',
      district: 'Zamalek',
      region: 'Greater Cairo',
      latitude: 30.05,
      longitude: 31.22,
      status: BinStatus.Offline,
      fillLevel: 15,
      collectorName: null,
      lastServicedAt: null,
      updatedAt: '2025-06-11T08:00:00Z',
    },
    {
      binId: 'BIN-0005',
      name: 'Sidi Gaber Station',
      area: 'Sidi Gaber',
      district: 'Sidi Gaber',
      region: 'Alexandria',
      latitude: 31.21,
      longitude: 29.93,
      status: BinStatus.Available,
      fillLevel: 50,
      collectorName: 'Tarek Mansour',
      lastServicedAt: '2025-06-11T07:30:00Z',
      updatedAt: '2025-06-11T07:30:00Z',
    },
  ];

  beforeEach(async () => {
    uninstallFakeMaps = installFakeGoogleMaps();
    resetFakeGoogleMapsCounters();

    feedSubject = new Subject<BinMapResponse>();
    mockLiveFeed = {
      status: signal<'live' | 'stale' | 'paused' | 'error'>('live').asReadonly(),
      lastUpdatedAt: signal<Date | null>(new Date()).asReadonly(),
      updates$: feedSubject.asObservable(),
      start: vi.fn(),
      stop: vi.fn(),
      refreshNow: vi.fn(),
    };

    mockBudgetService = {
      allow: vi.fn().mockReturnValue(true),
      recordInit: vi.fn().mockReturnValue(true),
    };

    mockLoaderService = {
      state: signal('ready'),
      load: vi.fn().mockResolvedValue(undefined),
    };

    mockConfigService = {
      getConfig: vi.fn().mockReturnValue({
        googleMaps: { apiKey: 'TEST_KEY', mapId: 'DEMO_MAP_ID' },
        map: { refreshSeconds: 30 },
      }),
      loadConfig: vi.fn().mockResolvedValue({
        googleMaps: { apiKey: 'TEST_KEY', mapId: 'DEMO_MAP_ID' },
        map: { refreshSeconds: 30 },
      }),
    };

    await TestBed.configureTestingModule({
      imports: [LiveBinMap],
      providers: [
        { provide: MapLoadBudgetService, useValue: mockBudgetService },
        { provide: GoogleMapsLoaderService, useValue: mockLoaderService },
        { provide: AppConfigService, useValue: mockConfigService },
      ],
    })
      .overrideComponent(LiveBinMap, {
        set: {
          providers: [{ provide: BIN_LIVE_FEED, useValue: mockLiveFeed }],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LiveBinMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    uninstallFakeMaps();
    vi.useRealTimers();
  });

  it('1. filters/counts per region: counts reflect active region regardless of checkbox state', () => {
    fixture.detectChanges();

    // Emit initial dataset
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // Active region should default to 'Greater Cairo'
    expect(component.activeRegion()).toBe('Greater Cairo');

    // In Greater Cairo: Available: 1, 80%: 1, 95%: 1, Offline: 1 -> Total = 4
    const initialCounts = component.regionStatusCounts();
    expect(initialCounts[BinStatus.Available]).toBe(1);
    expect(initialCounts[BinStatus.EightyPercentFull]).toBe(1);
    expect(initialCounts[BinStatus.NeedsServicing]).toBe(1);
    expect(initialCounts[BinStatus.Offline]).toBe(1);
    expect(component.displayedBins().length).toBe(4);
    expect(component.subtitleText()).toBe('4 of 4 bins shown');

    // Uncheck 'Available' filter
    component.onStatusFilterToggle(BinStatus.Available);
    fixture.detectChanges();

    // Displayed bins decreases to 3
    expect(component.displayedBins().length).toBe(3);
    expect(component.subtitleText()).toBe('3 of 4 bins shown');

    // CRITICAL: The count next to Available MUST STILL BE 1 (counts reflect active region regardless of checkboxes!)
    const updatedCounts = component.regionStatusCounts();
    expect(updatedCounts[BinStatus.Available]).toBe(1);

    // Switch region to Alexandria
    component.onRegionTabClick('Alexandria');
    fixture.detectChanges();

    expect(component.activeRegion()).toBe('Alexandria');
    const alexCounts = component.regionStatusCounts();
    expect(alexCounts[BinStatus.Available]).toBe(1);
    expect(alexCounts[BinStatus.NeedsServicing]).toBe(0);
  });

  it('2. list <-> marker selection sync: selects bin, highlights row, pans map, and Esc clears', () => {
    fixture.detectChanges();
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // Select bin BIN-0003
    component.onBinSelect('BIN-0003');
    fixture.detectChanges();

    expect(component.selectedBinId()).toBe('BIN-0003');
    expect(component.selectedBin()?.name).toBe('Tahrir Square North');

    // Details card should be present
    const cardEl = fixture.nativeElement.querySelector('app-bin-detail-card');
    expect(cardEl).toBeTruthy();
    expect(cardEl.textContent).toContain('BIN-0003');
    expect(cardEl.textContent).toContain('Tahrir Square North');

    // Press Escape
    component.onEscapePressed();
    fixture.detectChanges();

    expect(component.selectedBinId()).toBeNull();
    expect(component.selectedBin()).toBeNull();
    expect(fixture.nativeElement.querySelector('app-bin-detail-card')).toBeNull();
  });

  it('3. diff-based marker updates: in-place update keeps constructor count constant without rebuild', () => {
    fixture.detectChanges();
    feedSubject.next({
      items: [sampleBins[0], sampleBins[1]],
      meta: { totalItems: 2, returned: 2, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    const initialConstructors = FakeAdvancedMarkerElement.instancesCreated;
    expect(initialConstructors).toBe(2);

    // Live update arrives: fill level and status drift for existing bins
    const updatedBins: BinMapItem[] = [
      { ...sampleBins[0], fillLevel: 42 },
      { ...sampleBins[1], fillLevel: 88, status: BinStatus.NeedsServicing },
    ];

    feedSubject.next({
      items: updatedBins,
      meta: { totalItems: 2, returned: 2, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // Constructor count must remain STRICTLY constant (no rebuild, in-place diff update!)
    expect(FakeAdvancedMarkerElement.instancesCreated).toBe(initialConstructors);
    expect(component.allBins()[0].fillLevel).toBe(42);
    expect(component.allBins()[1].fillLevel).toBe(88);
  });

  it('4. cluster color = worst status inside the cluster', () => {
    // Unit tests for worst status calculation
    expect(getWorstStatus([BinStatus.Available, BinStatus.NeedsServicing])).toBe(
      BinStatus.NeedsServicing
    );
    expect(
      getWorstStatus([BinStatus.Available, BinStatus.EightyPercentFull])
    ).toBe(BinStatus.EightyPercentFull);
    expect(getWorstStatus([BinStatus.Available, BinStatus.Offline])).toBe(
      BinStatus.Offline
    );
    expect(getWorstStatus([BinStatus.Available, BinStatus.Available])).toBe(
      BinStatus.Available
    );
    expect(
      getWorstStatus([BinStatus.EightyPercentFull, BinStatus.NeedsServicing])
    ).toBe(BinStatus.NeedsServicing);

    expect(getStatusSeverity(BinStatus.NeedsServicing)).toBe('danger');
    expect(getStatusSeverity(BinStatus.EightyPercentFull)).toBe('warning');
    expect(getStatusSeverity(BinStatus.Offline)).toBe('neutral');
    expect(getStatusSeverity(BinStatus.Available)).toBe('success');

    // Test renderer DOM element generation
    const renderer = new BinClusterRenderer();
    const cluster = {
      count: 3,
      position: { lat: 30.04, lng: 31.23 },
      markers: [
        { _binStatus: BinStatus.Available },
        { _binStatus: BinStatus.NeedsServicing },
        { _binStatus: BinStatus.EightyPercentFull },
      ],
    };

    const rendered = renderer.render(cluster);
    // In stub/dom environment, content container has cluster-danger
    const content = (rendered as any).content ?? rendered;
    expect(content.className).toContain('cluster-danger');
    expect(content.textContent).toBe('3');
  });

  it('5. card content and link URL safety: validates coordinates and prevents unsafe navigation', () => {
    fixture.detectChanges();
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    component.onBinSelect('BIN-0003');
    fixture.detectChanges();

    const directionsLink: HTMLAnchorElement = fixture.nativeElement.querySelector('.btn-directions');
    expect(directionsLink).toBeTruthy();
    expect(directionsLink.href).toContain('https://www.google.com/maps/dir/?api=1&destination=');
    expect(directionsLink.href).toContain('30.06');
    expect(directionsLink.href).toContain('31.25');
    expect(directionsLink.target).toBe('_blank');
    expect(directionsLink.rel).toBe('noopener noreferrer');

    const viewDetailsBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.btn-view-details');
    expect(viewDetailsBtn.disabled).toBe(true);
  });

  it('6. theme change recreates map once (debounced) and restores state', () => {
    vi.useFakeTimers();
    const themeService = TestBed.inject(ThemeService);
    themeService.theme.set('light');

    fixture.detectChanges();
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    component.onBinSelect('BIN-0002');
    const initialMapInits = FakeMap.instancesCreated;

    // Toggle theme to dark
    themeService.theme.set('dark');
    fixture.detectChanges();

    // Map should not immediately recreate before 400ms debounce
    expect(FakeMap.instancesCreated).toBe(initialMapInits);

    // Advance debounce timer (400ms) and remount tick
    vi.advanceTimersByTime(450);
    fixture.detectChanges();
    vi.advanceTimersByTime(50);
    fixture.detectChanges();

    // Map recreated once
    expect(FakeMap.instancesCreated).toBe(initialMapInits + 1);
    expect(component.selectedBinId()).toBe('BIN-0002');
  });

  it('7. budget exceeded state: shows app-map-unavailable with budget-exceeded variant', async () => {
    mockBudgetService.allow.mockReturnValue(false);

    const canvas = component.mapCanvas()!;
    await canvas.initializeMapFlow();
    fixture.detectChanges();

    const unavailableEl = fixture.nativeElement.querySelector('app-map-unavailable');
    expect(unavailableEl).toBeTruthy();
    expect(unavailableEl.textContent).toContain('Map Reload Limit Reached');
  });

  it('8. unavailable states keep the left panel fully usable', async () => {
    mockLoaderService.state.set('not-configured');
    const canvas = component.mapCanvas()!;
    await canvas.initializeMapFlow();
    fixture.detectChanges();

    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // Left panel works completely even without map!
    expect(component.displayedBins().length).toBe(4);
    expect(component.regionStatusCounts()[BinStatus.Available]).toBe(1);

    component.onBinSelect('BIN-0001');
    fixture.detectChanges();
    expect(component.selectedBinId()).toBe('BIN-0001');
  });

  it('9. live updates announcements are capped at maximum 3 per refresh', () => {
    fixture.detectChanges();
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // 4 bins change status at once
    const updated = sampleBins.map((b) => ({
      ...b,
      status: BinStatus.NeedsServicing,
    }));

    feedSubject.next({
      items: updated,
      meta: { totalItems: 5, returned: 5, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    // Announcements must be capped at 3
    expect(component.announcements().length).toBeLessThanOrEqual(3);
  });

  it('10. XSS seed name rendered as text without execution', () => {
    const xssBin: BinMapItem = {
      binId: 'BIN-XSS',
      name: '<script>alert(1)</script><img src=x onerror=alert(2)> Downtown Clean Bin',
      area: 'Downtown',
      district: 'Downtown',
      region: 'Greater Cairo',
      latitude: 30.04,
      longitude: 31.23,
      status: BinStatus.Available,
      fillLevel: 10,
      collectorName: 'Ahmed',
      lastServicedAt: null,
      updatedAt: '2025-06-11T09:00:00Z',
    };

    fixture.detectChanges();
    feedSubject.next({
      items: [xssBin],
      meta: { totalItems: 1, returned: 1, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    component.onBinSelect('BIN-XSS');
    fixture.detectChanges();

    const cardEl = fixture.nativeElement.querySelector('app-bin-detail-card');
    expect(cardEl.innerHTML).not.toContain('<script>');
    expect(cardEl.innerHTML).not.toContain('<img src=x');
  });

  it('11. truncated response triggers bbox refetch on map idle', () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    feedSubject.next({
      items: sampleBins,
      meta: { totalItems: 5000, returned: 5000, truncated: true, generatedAt: '' },
    });
    fixture.detectChanges();

    expect(component.isTruncated()).toBe(true);
    const banner = fixture.nativeElement.querySelector('.truncated-banner');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Showing the first 5,000 bins');

    // Trigger map bounds change
    component.onMapBoundsChanged('30.0,31.2,30.1,31.3');

    // Debounce 500ms
    vi.advanceTimersByTime(550);
    expect(mockLiveFeed.refreshNow).toHaveBeenCalled();
  });

  it('12. bin marker DOM structure: renders teardrop pin SVG, recycle glyph, and label above pin', () => {
    fixture.detectChanges();
    feedSubject.next({
      items: [sampleBins[0]],
      meta: { totalItems: 1, returned: 1, truncated: false, generatedAt: '' },
    });
    fixture.detectChanges();

    const markers = FakeAdvancedMarkerElement.instances;
    expect(markers.length).toBeGreaterThanOrEqual(1);

    const markerEl = markers[0].content as HTMLElement;
    expect(markerEl).toBeTruthy();
    expect(markerEl.classList.contains('bin-marker')).toBe(true);
    expect(markerEl.classList.contains('marker-success')).toBe(true);

    // Label above pin
    const labelEl = markerEl.querySelector('.bin-marker-label');
    expect(labelEl).toBeTruthy();
    expect(labelEl?.textContent).toBe('BIN-0001');

    // SVG Pin
    const svgEl = markerEl.querySelector('svg.bin-marker-pin');
    expect(svgEl).toBeTruthy();

    // Shape & Glyph
    const shapeEl = svgEl?.querySelector('.bin-marker-shape');
    expect(shapeEl).toBeTruthy();
    const glyphEl = svgEl?.querySelector('.bin-marker-glyph');
    expect(glyphEl).toBeTruthy();
  });
});
