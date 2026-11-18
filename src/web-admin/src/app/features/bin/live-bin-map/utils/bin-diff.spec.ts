import { describe, it, expect } from 'vitest';
import { diffBins } from './bin-diff';
import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';

describe('diffBins', () => {
  const sampleBin1: BinMapItem = {
    binId: 'B-001',
    name: 'Tahrir Square',
    area: 'Downtown',
    district: 'Cairo',
    region: 'Greater Cairo',
    latitude: 30.0444,
    longitude: 31.2357,
    status: BinStatus.Available,
    fillLevel: 30,
    collectorName: 'Amr',
    lastServicedAt: '2026-11-14T08:00:00Z',
    updatedAt: '2026-11-14T08:00:00Z',
  };

  const sampleBin2: BinMapItem = {
    binId: 'B-002',
    name: 'Zamalek Club',
    area: 'Zamalek',
    district: 'Cairo',
    region: 'Greater Cairo',
    latitude: 30.0609,
    longitude: 31.2197,
    status: BinStatus.EightyPercentFull,
    fillLevel: 85,
    collectorName: 'Hossam',
    lastServicedAt: '2026-11-14T08:30:00Z',
    updatedAt: '2026-11-14T08:30:00Z',
  };

  it('marks all items as added when previous list is empty', () => {
    const result = diffBins([], [sampleBin1, sampleBin2]);
    expect(result.added.length).toBe(2);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('marks all items as removed when next list is empty', () => {
    const result = diffBins([sampleBin1, sampleBin2], []);
    expect(result.added).toEqual([]);
    expect(result.removed.length).toBe(2);
    expect(result.changed).toEqual([]);
  });

  it('detects no changes when collections have identical data', () => {
    const result = diffBins([sampleBin1], [{ ...sampleBin1 }]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.changed).toEqual([]);
  });

  it('detects status and fillLevel changes on existing bins', () => {
    const updatedBin1: BinMapItem = {
      ...sampleBin1,
      status: BinStatus.NeedsServicing,
      fillLevel: 98,
    };

    const result = diffBins([sampleBin1], [updatedBin1]);
    expect(result.added).toEqual([]);
    expect(result.removed).toEqual([]);
    expect(result.changed.length).toBe(1);
    expect(result.changed[0].item.binId).toBe('B-001');
    expect(result.changed[0].changes).toContain('status');
    expect(result.changed[0].changes).toContain('fillLevel');
  });

  it('detects coordinate and name changes', () => {
    const movedBin: BinMapItem = {
      ...sampleBin2,
      latitude: 30.0615,
      longitude: 31.2205,
      name: 'Zamalek Club Gate 2',
    };

    const result = diffBins([sampleBin2], [movedBin]);
    expect(result.changed.length).toBe(1);
    expect(result.changed[0].changes).toEqual(
      expect.arrayContaining(['latitude', 'longitude', 'name'])
    );
  });

  it('handles simultaneous additions, removals, and modifications', () => {
    const bin3: BinMapItem = {
      binId: 'B-003',
      name: 'Maadi Corniche',
      area: 'Maadi',
      district: 'Cairo',
      region: 'Greater Cairo',
      latitude: 29.9602,
      longitude: 31.2568,
      status: BinStatus.Available,
      fillLevel: 45,
      collectorName: 'Salma',
      lastServicedAt: null,
      updatedAt: '2026-11-14T09:00:00Z',
    };

    const modifiedBin1 = { ...sampleBin1, fillLevel: 75 };

    const prev = [sampleBin1, sampleBin2];
    const next = [modifiedBin1, bin3]; // sampleBin2 removed, bin3 added, sampleBin1 changed

    const result = diffBins(prev, next);
    expect(result.added.map((b) => b.binId)).toEqual(['B-003']);
    expect(result.removed.map((b) => b.binId)).toEqual(['B-002']);
    expect(result.changed.length).toBe(1);
    expect(result.changed[0].item.binId).toBe('B-001');
    expect(result.changed[0].changes).toEqual(['fillLevel']);
  });
});
