// GAP: see gap_api.md → Admin Bins List & Map Data (UI p3, p4)
import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { BinStatus } from './bin-status.enum';

/**
 * Filter query parameters for bins list and live map (UI p3, p4).
 */
export interface BinQuery extends PageQuery {
  district?: string;
  status?: BinStatus;
  collectorId?: Id;
  search?: string;
}

/**
 * Smart bin row item used in the Bins List table and Live Bin Map (UI p3, p4).
 */
export interface BinListItem {
  binId: Id;
  name: string;
  area?: string | null;
  district: string | null;
  region?: string | null;
  latitude: number | null;
  longitude: number | null;
  fillLevel: number; // percentage (0 - 100)
  capacityThresholdKg?: number | null;
  status: BinStatus;
  collectorId?: Id | null;
  collectorName?: string | null;
  lastServicedAt: string | null; // ISO 8601 string or formatted string
}
