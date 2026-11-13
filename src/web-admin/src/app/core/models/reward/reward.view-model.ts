// GAP: see gap_api.md → Rewards Catalog Management (UI p12, p13, p14)
import { Id } from '../common/id.model';
import { RewardCategory } from './reward-category.enum';
import { RewardStatus } from './reward-status.enum';
import { VoucherCodeType } from './voucher-code-type.enum';

/**
 * Filter query parameters for the rewards catalog table and grid (UI p12, p14).
 */
export interface RewardQuery {
  category?: RewardCategory;
  status?: RewardStatus;
  search?: string;
}

/**
 * Enriched reward item displayed in both the Grid and Table views (UI p12, p14).
 */
export interface AdminRewardItem {
  itemId: Id;
  code: string; // e.g. 'RWD-001'
  title: string;
  description: string;
  category: RewardCategory;
  voucherCodeType: VoucherCodeType;
  pointsCost: number;
  stock: number;
  redemptionsCount: number;
  status: RewardStatus;
  imageUrl?: string;
  validFrom?: string;  // ISO date string
  validUntil?: string; // ISO date string
}
