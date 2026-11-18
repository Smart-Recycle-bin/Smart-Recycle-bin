import { BinMapItem } from '@models/bin/bin-map.model';

export interface BinChange {
  item: BinMapItem;
  changes: (keyof BinMapItem)[];
}

export interface BinDiffResult {
  added: BinMapItem[];
  removed: BinMapItem[];
  changed: BinChange[];
}

const MONITORED_FIELDS: (keyof BinMapItem)[] = [
  'status',
  'fillLevel',
  'name',
  'latitude',
  'longitude',
  'area',
  'district',
  'region',
  'collectorName',
  'lastServicedAt',
];

/**
 * Computes difference between two sets of map bins to support targeted, in-place marker updates.
 *
 * @param prev Previous list of map bins
 * @param next Newly received list of map bins
 * @returns { added, removed, changed } delta
 */
export function diffBins(
  prev: BinMapItem[] = [],
  next: BinMapItem[] = []
): BinDiffResult {
  const prevMap = new Map<string, BinMapItem>();
  for (const item of prev) {
    prevMap.set(item.binId, item);
  }

  const nextMap = new Map<string, BinMapItem>();
  for (const item of next) {
    nextMap.set(item.binId, item);
  }

  const added: BinMapItem[] = [];
  const changed: BinChange[] = [];
  const removed: BinMapItem[] = [];

  // Identify added and changed
  for (const [binId, nextItem] of nextMap.entries()) {
    const prevItem = prevMap.get(binId);
    if (!prevItem) {
      added.push(nextItem);
    } else {
      const fieldChanges: (keyof BinMapItem)[] = [];
      for (const field of MONITORED_FIELDS) {
        if (prevItem[field] !== nextItem[field]) {
          fieldChanges.push(field);
        }
      }

      if (fieldChanges.length > 0) {
        changed.push({
          item: nextItem,
          changes: fieldChanges,
        });
      }
    }
  }

  // Identify removed
  for (const [binId, prevItem] of prevMap.entries()) {
    if (!nextMap.has(binId)) {
      removed.push(prevItem);
    }
  }

  return { added, removed, changed };
}
