import { TableAction, TableColumn } from '../../../shared/components/table/data-table/data-table';
import { AdminRewardItem } from '../../../core/models/reward/reward.view-model';
import {
  RewardStatus,
  REWARD_STATUS_LABELS,
} from '../../../core/models/reward/reward-status.enum';
import {
  RewardCategory,
  REWARD_CATEGORY_LABELS,
} from '../../../core/models/reward/reward-category.enum';
import {
  VoucherCodeType,
  VOUCHER_CODE_TYPE_LABELS,
} from '../../../core/models/reward/voucher-code-type.enum';
import { BadgeVariant } from '../../../shared/components/badge/badge';
import { SegmentedOption } from '../../../shared/components/segmented-control/segmented-control';
import { SelectOption } from '../../../shared/components/form/select/select';

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
