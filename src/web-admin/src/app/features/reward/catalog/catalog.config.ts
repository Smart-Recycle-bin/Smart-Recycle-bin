import { TableAction, TableColumn } from '@shared/components/table/data-table/data-table';
import { AdminRewardItem } from '@models/reward/reward.view-model';
import {
  RewardStatus,
  REWARD_STATUS_LABELS,
} from '@models/reward/reward-status.enum';
import {
  RewardCategory,
  REWARD_CATEGORY_LABELS,
} from '@models/reward/reward-category.enum';
import {
  VoucherCodeType,
  VOUCHER_CODE_TYPE_LABELS,
} from '@models/reward/voucher-code-type.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { SegmentedOption } from '@shared/components/segmented-control/segmented-control';
import { SelectOption } from '@shared/components/form/select/select';

export type CatalogViewMode = 'grid' | 'table';

export const VIEW_MODE_OPTIONS: SegmentedOption<CatalogViewMode>[] = [
  { label: 'Grid', value: 'grid' },
  { label: 'Table', value: 'table' },
];

export const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { label: 'All statuses', value: '' },
  { label: 'Active', value: RewardStatus.InStock },
  { label: 'Out of Stock', value: RewardStatus.OutOfStock },
  { label: 'Archived', value: RewardStatus.Archived },
];

export const CATEGORY_FORM_OPTIONS: SelectOption[] = Object.entries(
  REWARD_CATEGORY_LABELS
).map(([value, label]) => ({
  value,
  label,
}));

export const VOUCHER_CODE_TYPE_OPTIONS: SelectOption[] = Object.entries(
  VOUCHER_CODE_TYPE_LABELS
).map(([value, label]) => ({
  value,
  label,
}));

export const REWARD_STATUS_BADGE_VARIANTS: Record<RewardStatus, BadgeVariant> = {
  [RewardStatus.InStock]: 'success',
  [RewardStatus.OutOfStock]: 'danger',
  [RewardStatus.Archived]: 'neutral',
};

export const REWARD_TABLE_COLUMNS: TableColumn<AdminRewardItem>[] = [
  {
    key: 'title',
    label: 'Item',
    sortable: true,
  },
  {
    key: 'category',
    label: 'Category',
    sortable: true,
    width: '140px',
  },
  {
    key: 'pointsCost',
    label: 'Price',
    sortable: true,
    align: 'right',
    width: '120px',
  },
  {
    key: 'stock',
    label: 'Stock',
    sortable: true,
    align: 'right',
    width: '110px',
  },
  {
    key: 'redemptionsCount',
    label: 'Redemptions',
    sortable: true,
    align: 'right',
    width: '130px',
  },
  {
    key: 'status',
    label: 'Status',
    align: 'center',
    sortable: true,
    width: '130px',
  },
];

export const REWARD_TABLE_ACTIONS: TableAction<AdminRewardItem>[] = [
  {
    id: 'edit',
    icon: 'pencil',
    label: 'Edit reward',
    variant: 'ghost',
  },
  {
    id: 'archive',
    icon: 'archive',
    label: 'Archive reward',
    variant: 'danger',
    visible: (row) => row.status !== RewardStatus.Archived,
  },
];

/**
 * 8 theme-aware curated gradient pairs matching the PDF mockups (UI p12).
 * Each gradient pair has a subtle, rich aesthetic with strong contrast
 * for the centered white gift icon and status badge.
 */
export const REWARD_CURATED_GRADIENTS: string[] = [
  'linear-gradient(135deg, #059669 0%, #10B981 100%)', // 0: Emerald (Carrefour)
  'linear-gradient(135deg, #B45309 0%, #F59E0B 100%)', // 1: Amber/Gold (Talabat)
  'linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)', // 2: Crimson/Coral (Vodafone)
  'linear-gradient(135deg, #5B21B6 0%, #8B5CF6 100%)', // 3: Indigo/Purple (Cinema)
  'linear-gradient(135deg, #0369A1 0%, #06B6D4 100%)', // 4: Cyan/Ocean (Steel Bottle)
  'linear-gradient(135deg, #15803D 0%, #22C55E 100%)', // 5: Green/Leaf (Tree Planting)
  'linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)', // 6: Cobalt Blue (Uber)
  'linear-gradient(135deg, #92400E 0%, #D97706 100%)', // 7: Warm Bronze (Bookstore)
];

/**
 * Deterministically picks one of the 8 curated gradient pairs based on the reward ID.
 */
export function getRewardCuratedGradient(rewardId: string | null | undefined): string {
  if (!rewardId) {
    return REWARD_CURATED_GRADIENTS[0];
  }
  const numMatch = rewardId.match(/\d+/);
  if (numMatch) {
    const idx = (parseInt(numMatch[0], 10) - 1) % REWARD_CURATED_GRADIENTS.length;
    if (idx >= 0 && idx < REWARD_CURATED_GRADIENTS.length) {
      return REWARD_CURATED_GRADIENTS[idx];
    }
  }
  let hash = 0;
  for (let i = 0; i < rewardId.length; i++) {
    hash = (hash * 31 + rewardId.charCodeAt(i)) >>> 0;
  }
  return REWARD_CURATED_GRADIENTS[hash % REWARD_CURATED_GRADIENTS.length];
}
