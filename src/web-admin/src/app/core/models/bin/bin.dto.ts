import { Id } from '../common/id.model';
import { BinStatus } from './bin-status.enum';

/**
 * Request payload for POST /api/v1/admin/bins (APIs.md 7.1).
 */
export interface RegisterBinRequest {
  serialNumber: string;
  latitude: number;
  longitude: number;
  district: string;
  capacityThresholdKg: number;
}

/**
 * Response data for POST /api/v1/admin/bins (APIs.md 7.1).
 */
export interface RegisterBinResponse {
  binId: Id;
  serialNumber: string;
  qrCode: string;
  status: BinStatus;
  createdAt: string; // ISO 8601 string
}

/**
 * Request payload for POST /api/v1/admin/bins/{binId}/assignment (APIs.md 7.3).
 */
export interface AssignBinRequest {
  collectorId: Id;
}

/**
 * Response data for POST /api/v1/admin/bins/{binId}/assignment (APIs.md 7.3).
 */
export interface AssignBinResponse {
  binId: Id;
  collectorId: Id;
  assignedAt: string; // ISO 8601 string
}
