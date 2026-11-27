import { Id } from '../common/id.model';
import { PageQuery } from '../common/page.model';
import { RewardCategory } from './reward-category.enum';
import { RewardStatus } from './reward-status.enum';
import { VoucherCodeType } from './voucher-code-type.enum';

/**
 * Filter and pagination query parameters for GET /api/v1/admin/catalog.
 */
export interface RewardQuery extends PageQuery {
  categoryId?: Id;
  status?: RewardStatus;
  search?: string;
}

/**
 * Reward item returned by GET /api/v1/admin/catalog and displayed in Grid and Table views.
 */
export interface AdminRewardItem {
  itemId: Id;
  code?: string; // e.g. 'RWD-001'
  title: string;
  description?: string | null;
  categoryId: Id;
  categoryName: string;
  category?: RewardCategory | string;
  voucherCodeType: VoucherCodeType | string | null;
  pointsCost: number;
  stock: number;
  redemptionsCount: number;
  status: RewardStatus;
  imageUrl?: string | null;
  validFrom?: string | null;  // ISO date string
  validUntil?: string | null; // ISO date string
}
