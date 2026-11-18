import { BinStatus } from './bin-status.enum';

/**
 * Smart bin data item returned by the non-paginated live map endpoint
 * (GET /api/v1/admin/bins/map).
 */
export interface BinMapItem {
  binId: string;
  name: string;
  area: string;
  district: string;
  region: string;
  latitude: number;
  longitude: number;
  status: BinStatus;
  fillLevel: number; // 0 - 100
  collectorName: string | null;
  lastServicedAt: string | null;
  updatedAt: string;
}

/**
 * Query parameters for filtering map bins.
 */
export interface BinMapQuery {
  region?: string;
  status?: BinStatus | BinStatus[];
  /** Bounding box string formatted as "south,west,north,east" */
  bbox?: string;
}

/**
 * Response metadata for live map endpoint, including scale truncation indicator.
 */
export interface BinMapMeta {
  totalItems: number;
  returned: number;
  truncated: boolean;
  generatedAt: string;
}

/**
 * Wrapper for the live map response (items + meta).
 */
export interface BinMapResponse {
  items: BinMapItem[];
  meta: BinMapMeta;
}

