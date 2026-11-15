import { Id } from '../common/id.model';
import { RewardStatus } from './reward-status.enum';
import { VoucherCodeType } from './voucher-code-type.enum';

/**
 * Request payload for POST /api/v1/admin/catalog (APIs.md 6.2 + enriched per UI p13).
 */
export interface CreateRewardRequest {
  title: string;
  description: string;
  category: string;
  pointsCost: number;
  stock: number;
  voucherCodeType?: VoucherCodeType;
  validFrom?: string; // ISO date string
  validUntil?: string; // ISO date string
  imageUrl?: string; // PROPOSED: see gap_api.md -> Enriched endpoint
}

/**
 * Request payload for PUT /api/v1/admin/catalog/{itemId} (APIs.md 6.3 + enriched per UI p13).
 */
export interface UpdateRewardRequest {
  title?: string;
  description?: string;
  category?: string;
  pointsCost?: number;
  stock?: number;
  voucherCodeType?: VoucherCodeType;
  validFrom?: string; // ISO date string
  validUntil?: string; // ISO date string
  imageUrl?: string; // PROPOSED: see gap_api.md -> Enriched endpoint
}

/**
 * Response data for POST /api/v1/admin/catalog/{itemId}/archive (APIs.md 6.4).
 */
export interface ArchiveRewardResponse {
  itemId: Id;
  status: RewardStatus;
  message: string;
}
