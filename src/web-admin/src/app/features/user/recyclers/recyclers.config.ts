import { TableAction, TableColumn } from '@shared/components/table/data-table/data-table';
import { RecyclerListItem } from '@models/user/recycler.view-model';
import { AccountStatus, ACCOUNT_STATUS_LABELS } from '@models/user/account-status.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { SelectOption } from '@shared/components/form/select/select';

export const RECYCLER_TABLE_COLUMNS: TableColumn<RecyclerListItem>[] = [
  {
    key: 'name',
    label: 'User',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'availablePoints',
    label: 'Available Points',
    sortable: true,
    align: 'right',
  },
  {
    key: 'lifetimePoints',
    label: 'Lifetime Points',
    sortable: true,
    align: 'right',
  },
  {
    key: 'sessions',
    label: 'Sessions',
    sortable: true,
    align: 'right',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '140px',
  },
  {
    key: 'joined',
    label: 'Joined',
    sortable: true,
    value: (row) => (row.joined ? new Date(row.joined).getTime() : 0),
    width: '140px',
  },
];

export const RECYCLER_TABLE_ACTIONS: TableAction<RecyclerListItem>[] = [
  {
    id: 'view',
    icon: 'eye',
    label: 'View details (Coming soon)',
    disabled: () => true,
    visible: () => true,
  },
  {
    id: 'suspend',
    icon: 'ban',
    label: 'Suspend recycler',
    variant: 'danger',
    visible: (row: RecyclerListItem) => row.status === AccountStatus.Active,
  },
  {
    id: 'unsuspend',
    icon: 'refresh',
    label: 'Unsuspend recycler',
    variant: 'ghost',
    visible: (row: RecyclerListItem) => row.status === AccountStatus.Suspended,
  },
];

export const RECYCLER_STATUS_OPTIONS: SelectOption[] = [
  { label: 'All statuses', value: '' },
  { label: ACCOUNT_STATUS_LABELS[AccountStatus.Active], value: AccountStatus.Active },
  { label: ACCOUNT_STATUS_LABELS[AccountStatus.Suspended], value: AccountStatus.Suspended },
  { label: ACCOUNT_STATUS_LABELS[AccountStatus.Banned], value: AccountStatus.Banned },
];

export function getRecyclerStatusBadgeVariant(status: unknown): BadgeVariant {
  switch (status) {
    case AccountStatus.Active:
      return 'success';
    case AccountStatus.Suspended:
      return 'warning';
    case AccountStatus.Banned:
      return 'danger';
    case AccountStatus.Inactive:
    default:
      return 'neutral';
  }
}

export function getRecyclerStatusLabel(status: unknown): string {
  if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ACCOUNT_STATUS_LABELS, status)) {
    return ACCOUNT_STATUS_LABELS[status as AccountStatus];
  }
  return String(status ?? '');
}
