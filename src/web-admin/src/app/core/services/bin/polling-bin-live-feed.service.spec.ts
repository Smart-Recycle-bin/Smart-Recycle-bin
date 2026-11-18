import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { of, throwError, Subject } from 'rxjs';
import { PollingBinLiveFeed } from './polling-bin-live-feed.service';
import { BinsService } from './bins.service';
import { AppConfigService } from '../config/app-config.service';
import { BinMapResponse } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';

describe('PollingBinLiveFeed', () => {
  let feed: PollingBinLiveFeed;
  let binsServiceSpy: { getMapBins: ReturnType<typeof vi.fn> };
  let appConfigServiceSpy: { getConfig: ReturnType<typeof vi.fn> };

  const mockResponse: BinMapResponse = {
    items: [
      {
        binId: 'B-01',
        name: 'Bin 1',
        area: 'Dokki',
        district: 'Giza',
        region: 'Greater Cairo',
        latitude: 30.04,
        longitude: 31.21,
        status: BinStatus.Available,
        fillLevel: 25,
        collectorName: 'Amr',
        lastServicedAt: null,
        updatedAt: '2026-11-17T12:00:00Z',
      },
    ],
    meta: {
      totalItems: 1,
      returned: 1,
      truncated: false,
      generatedAt: '2026-11-17T12:00:00Z',
    },
  };

  beforeEach(() => {
    vi.useFakeTimers();

    binsServiceSpy = {
      getMapBins: vi.fn().mockReturnValue(of(mockResponse)),
    };

    appConfigServiceSpy = {
      getConfig: vi.fn().mockReturnValue({
        googleMaps: { apiKey: 'TEST_KEY' },
        map: { refreshSeconds: 10 },
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        PollingBinLiveFeed,
        { provide: BinsService, useValue: binsServiceSpy },
        { provide: AppConfigService, useValue: appConfigServiceSpy },
      ],
    });

    feed = TestBed.inject(PollingBinLiveFeed);
  });

  afterEach(() => {
    feed.ngOnDestroy();
    vi.useRealTimers();
  });

  it('starts polling and emits initial response, setting status to live', () => {
    let emitted: BinMapResponse | null = null;
    feed.updates$.subscribe((res) => {
      emitted = res;
    });

    feed.start();

    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);
    expect(emitted).toEqual(mockResponse);
    expect(feed.status()).toBe('live');
    expect(feed.lastUpdatedAt()).toBeTruthy();
  });

  it('periodically polls according to refreshSeconds interval (+/- 10% jitter)', () => {
    feed.start();
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);

    // Advance 12 seconds (base 10s + 10% max jitter = 11s)
    vi.advanceTimersByTime(12000);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(12000);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(3);
  });

  it('pauses polling when tab is hidden and marks status paused', () => {
    feed.start();
    expect(feed.status()).toBe('live');

    // Simulate tab hidden
    Object.defineProperty(document, 'hidden', { value: true, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    expect(feed.status()).toBe('paused');

    // Advancing timers should not fire any network calls while hidden
    vi.advanceTimersByTime(30000);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);

    // Restore tab visible
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Should immediately refresh because data became stale while hidden
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);
    expect(feed.status()).toBe('live');
  });

  it('throttles refreshNow to a minimum of 5 seconds between manual requests', () => {
    feed.start();
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);

    feed.refreshNow(); // Ignored (< 5s since initial start)
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5100);
    feed.refreshNow(); // Permitted (> 5s)
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);

    feed.refreshNow(); // Ignored again
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);
  });

  it('implements exponential backoff on errors and sets stale after 3 failures', () => {
    binsServiceSpy.getMapBins.mockReturnValue(throwError(() => new Error('Server error 500')));

    feed.start();

    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);
    expect(feed.status()).toBe('error');

    // Failure 1: retry after 5s backoff
    vi.advanceTimersByTime(5500);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);

    // Failure 2: retry after 10s backoff (5s * 2^1)
    vi.advanceTimersByTime(10500);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(3);

    // 3rd consecutive failure: state transitions to 'stale'
    expect(feed.status()).toBe('stale');
  });

  it('cancels in-flight requests when a newer poll or refresh triggers via switchMap', () => {
    const delayedSubject = new Subject<BinMapResponse>();
    binsServiceSpy.getMapBins.mockReturnValue(delayedSubject);

    feed.start();

    vi.advanceTimersByTime(6000);
    feed.refreshNow();

    // Only 1 subscription should be active; older request is cancelled
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(2);
  });

  it('cleans up timers and event listeners on destroy', () => {
    feed.start();
    feed.ngOnDestroy();

    vi.advanceTimersByTime(60000);
    expect(binsServiceSpy.getMapBins).toHaveBeenCalledTimes(1);
    expect(feed.status()).toBe('paused');
  });
});
