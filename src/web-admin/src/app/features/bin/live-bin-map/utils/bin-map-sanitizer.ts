import { BinMapItem } from '@models/bin/bin-map.model';
import { BinStatus } from '@models/bin/bin-status.enum';

export interface SanitizeResult {
  items: BinMapItem[];
  dropped: number;
}

const VALID_STATUSES: Set<string> = new Set([
  BinStatus.Available,
  BinStatus.EightyPercentFull,
  BinStatus.NeedsServicing,
  BinStatus.Offline,
  'AVAILABLE',
  '≥80% FULL',
  '≥95% FULL / NEEDS SERVICING',
  '≥95% FULL',
  'offline',
  'OFFLINE',
]);

/**
 * Strips HTML tags, trims whitespace, and limits length.
 */
function cleanString(val: unknown, maxLength: number, fallback = ''): string {
  if (typeof val !== 'string') return fallback;
  const stripped = val
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
  return stripped.slice(0, maxLength);
}

/**
 * Normalizes wire status strings to standard domain BinStatus.
 */
function normalizeStatus(rawStatus: unknown, binId: string): BinStatus {
  if (typeof rawStatus === 'string') {
    const trimmed = rawStatus.trim();
    if (VALID_STATUSES.has(trimmed)) {
      if (trimmed.toUpperCase() === 'AVAILABLE') return BinStatus.Available;
      if (trimmed === '≥80% FULL' || trimmed === '80%') return BinStatus.EightyPercentFull;
      if (trimmed.startsWith('≥95%')) return BinStatus.NeedsServicing;
      if (trimmed.toLowerCase() === 'offline') return BinStatus.Offline;
    }
  }

  console.warn(
    `[BinMapSanitizer] Unknown bin status "${String(rawStatus)}" for bin ${binId}; defaulted to offline.`
  );
  return BinStatus.Offline;
}

/**
 * Defensively parses and cleans raw bin data returned from map API feed.
 *
 * Rules:
 * - Drops items with missing/empty binId.
 * - Drops items with non-finite or out-of-range latitude ([-90, 90]) or longitude ([-180, 180]).
 * - Deduplicates by binId (subsequent duplicates dropped).
 * - Maps unknown status values to BinStatus.Offline with a warning.
 * - Clamps fillLevel to [0, 100].
 * - Sanitizes and truncates strings (name <= 120 chars).
 * - Never throws.
 */
export function sanitizeMapBins(rawItems: unknown): SanitizeResult {
  try {
    if (!Array.isArray(rawItems)) {
      return { items: [], dropped: 0 };
    }

    const items: BinMapItem[] = [];
    const seenBinIds = new Set<string>();
    let dropped = 0;

    for (const raw of rawItems) {
      if (!raw || typeof raw !== 'object') {
        dropped++;
        continue;
      }

      const obj = raw as Record<string, unknown>;

      // 1. binId validation
      const binIdRaw = obj['binId'];
      if (typeof binIdRaw !== 'string' || binIdRaw.trim() === '') {
        dropped++;
        continue;
      }
      const binId = binIdRaw.trim();

      // 2. Deduplication
      if (seenBinIds.has(binId)) {
        dropped++;
        continue;
      }

      // 3. Coordinate validation
      const lat = Number(obj['latitude']);
      const lng = Number(obj['longitude']);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        dropped++;
        continue;
      }

      // 4. Fill level clamping [0, 100]
      const rawFill = Number(obj['fillLevel']);
      const fillLevel = !isNaN(rawFill) && Number.isFinite(rawFill)
        ? Math.max(0, Math.min(100, Math.round(rawFill)))
        : 0;

      // 5. Status mapping
      const status = normalizeStatus(obj['status'], binId);

      // 6. String sanitization
      const name = cleanString(obj['name'], 120, `Bin ${binId}`);
      const area = cleanString(obj['area'], 80, 'Unspecified Area');
      const district = cleanString(obj['district'], 80, 'Unspecified District');
      const region = cleanString(obj['region'], 80, 'Greater Cairo');
      const collectorName = typeof obj['collectorName'] === 'string' && obj['collectorName'].trim() !== ''
        ? cleanString(obj['collectorName'], 80)
        : null;
      const lastServicedAt = typeof obj['lastServicedAt'] === 'string' && obj['lastServicedAt'].trim() !== ''
        ? obj['lastServicedAt'].trim()
        : null;
      const updatedAt = typeof obj['updatedAt'] === 'string' && obj['updatedAt'].trim() !== ''
        ? obj['updatedAt'].trim()
        : new Date().toISOString();

      seenBinIds.add(binId);
      items.push({
        binId,
        name,
        area,
        district,
        region,
        latitude: lat,
        longitude: lng,
        status,
        fillLevel,
        collectorName,
        lastServicedAt,
        updatedAt,
      });
    }

    return { items, dropped };
  } catch (err) {
    console.warn('[BinMapSanitizer] Unexpected error during bin sanitation:', err);
    return { items: [], dropped: 0 };
  }
}
