import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sanitizeMapBins } from './bin-map-sanitizer';
import { BinStatus } from '@models/bin/bin-status.enum';

describe('bin-map-sanitizer', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('handles non-array and empty inputs safely without throwing', () => {
    expect(sanitizeMapBins(null)).toEqual({ items: [], dropped: 0 });
    expect(sanitizeMapBins(undefined)).toEqual({ items: [], dropped: 0 });
    expect(sanitizeMapBins('not-an-array')).toEqual({ items: [], dropped: 0 });
    expect(sanitizeMapBins({})).toEqual({ items: [], dropped: 0 });
    expect(sanitizeMapBins([])).toEqual({ items: [], dropped: 0 });
  });

  it('parses valid bin items accurately', () => {
    const raw = [
      {
        binId: 'BIN-001',
        name: 'Tahrir Square East',
        area: 'Downtown',
        district: 'Cairo',
        region: 'Greater Cairo',
        latitude: 30.0444,
        longitude: 31.2357,
        status: BinStatus.Available,
        fillLevel: 42,
        collectorName: 'Amr Shawky',
        lastServicedAt: '2026-11-14T08:00:00Z',
        updatedAt: '2026-11-14T08:30:00Z',
      },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.dropped).toBe(0);
    expect(result.items.length).toBe(1);
    expect(result.items[0]).toEqual(raw[0]);
  });

  it('drops items with missing or empty binId', () => {
    const raw = [
      { binId: '', latitude: 30.0, longitude: 31.0, status: 'AVAILABLE' },
      { binId: '   ', latitude: 30.0, longitude: 31.0, status: 'AVAILABLE' },
      { latitude: 30.0, longitude: 31.0, status: 'AVAILABLE' },
      { binId: 'VALID-1', latitude: 30.0, longitude: 31.0, status: 'AVAILABLE' },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.dropped).toBe(3);
    expect(result.items.length).toBe(1);
    expect(result.items[0].binId).toBe('VALID-1');
  });

  it('drops items with non-finite or out-of-range coordinates', () => {
    const raw = [
      { binId: 'B1', latitude: 91.0, longitude: 31.0 }, // lat > 90
      { binId: 'B2', latitude: -91.0, longitude: 31.0 }, // lat < -90
      { binId: 'B3', latitude: 30.0, longitude: 181.0 }, // lng > 180
      { binId: 'B4', latitude: 30.0, longitude: -185.0 }, // lng < -180
      { binId: 'B5', latitude: NaN, longitude: 31.0 },
      { binId: 'B6', latitude: 30.0, longitude: Infinity },
      { binId: 'B7', latitude: 30.0444, longitude: 31.2357 }, // Valid
    ];

    const result = sanitizeMapBins(raw);
    expect(result.dropped).toBe(6);
    expect(result.items.length).toBe(1);
    expect(result.items[0].binId).toBe('B7');
  });

  it('deduplicates items by binId, dropping subsequent duplicates', () => {
    const raw = [
      { binId: 'DUP-1', name: 'First occurrence', latitude: 30.0, longitude: 31.0 },
      { binId: 'DUP-1', name: 'Second occurrence', latitude: 30.0, longitude: 31.0 },
      { binId: 'DUP-2', name: 'Unique', latitude: 30.0, longitude: 31.0 },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.dropped).toBe(1);
    expect(result.items.length).toBe(2);
    expect(result.items[0].name).toBe('First occurrence');
  });

  it('maps unknown status to offline and emits a console warning', () => {
    const raw = [
      { binId: 'B1', latitude: 30.0, longitude: 31.0, status: 'BROKEN_UNKNOWN_STATUS' },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.items[0].status).toBe(BinStatus.Offline);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown bin status "BROKEN_UNKNOWN_STATUS"')
    );
  });

  it('clamps fillLevel between 0 and 100', () => {
    const raw = [
      { binId: 'B1', latitude: 30.0, longitude: 31.0, fillLevel: -25 },
      { binId: 'B2', latitude: 30.0, longitude: 31.0, fillLevel: 145 },
      { binId: 'B3', latitude: 30.0, longitude: 31.0, fillLevel: 'invalid' },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.items[0].fillLevel).toBe(0);
    expect(result.items[1].fillLevel).toBe(100);
    expect(result.items[2].fillLevel).toBe(0);
  });

  it('strips HTML tags and limits name length to 120 characters', () => {
    const maliciousName = '<script>alert("xss")</script><img src=x onerror=alert(1)> Smart Bin Downtown';
    const longName = 'A'.repeat(200);

    const raw = [
      { binId: 'B1', latitude: 30.0, longitude: 31.0, name: maliciousName },
      { binId: 'B2', latitude: 30.0, longitude: 31.0, name: longName },
    ];

    const result = sanitizeMapBins(raw);
    expect(result.items[0].name).not.toContain('<script>');
    expect(result.items[0].name).not.toContain('<img');
    expect(result.items[0].name).toBe('Smart Bin Downtown');

    expect(result.items[1].name.length).toBe(120);
  });
});
