import { Id } from '../common/id.model';
import { RewardStatus } from './reward-status.enum';
import { VoucherCodeType } from './voucher-code-type.enum';

/**
 * Reward category item returned by GET /api/v1/admin/catalog/categories.
 */
export interface RewardCategoryItem {
  categoryId: Id;
  name: string;
  status: string;
  logoUrl?: string | null;
}

/**
 * Request payload for POST /api/v1/admin/catalog.
 */
export interface CreateRewardRequest {
  title: string;
  description?: string;
  categoryId: Id;
  pointsCost: number;
  stock: number;
  voucherCodeType?: VoucherCodeType;
  validFrom?: string; // ISO date string
  validUntil?: string; // ISO date string
  imageUrl?: string;
}

/**
 * Request payload for PUT /api/v1/admin/catalog/{itemId}.
 */
export interface UpdateRewardRequest {
  title?: string;
  description?: string;
  categoryId?: Id;
  pointsCost?: number;
  stock?: number;
  voucherCodeType?: VoucherCodeType;
  validFrom?: string; // ISO date string
  validUntil?: string; // ISO date string
  imageUrl?: string;
}

/**
 * Response data for POST /api/v1/admin/catalog/{itemId}/archive.
 */
export interface ArchiveRewardResponse {
  itemId: Id;
  status: RewardStatus;
  message?: string;
}
