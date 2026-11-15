import { TableAction, TableColumn } from '../../../shared/components/table/data-table/data-table';
import { CollectorListItem } from '../../../core/models/collector/collector.view-model';
import { AccountStatus, ACCOUNT_STATUS_LABELS } from '../../../core/models/user/account-status.enum';
import { BadgeVariant } from '../../../shared/components/badge/badge';
import { CollectorCredentialsMode } from '../../../core/models/collector/collector-credentials-mode.enum';
import { SegmentedOption } from '../../../shared/components/segmented-control/segmented-control';

export const COLLECTOR_TABLE_COLUMNS: TableColumn<CollectorListItem>[] = [
  {
    key: 'name',
    label: 'Collector',
    sortable: true,
  },
  {
    key: 'email',
    label: 'Email',
    sortable: true,
  },
  {
    key: 'phone',
    label: 'Phone',
    sortable: true,
  },
  {
    key: 'assignedBinsCount',
    label: 'Assigned Bins',
    sortable: true,
    align: 'center',
    width: '150px',
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    width: '140px',
  },
  {
    key: 'lastActiveAt',
    label: 'Last Active',
    sortable: true,
    width: '170px',
  },
];

export const COLLECTOR_TABLE_ACTIONS: TableAction<CollectorListItem>[] = [
  {
    id: 'edit',
    icon: 'pencil',
    label: 'Edit collector details',
    variant: 'ghost',
    visible: () => true,
  },
  {
    id: 'assign',
    icon: 'truck',
    label: 'Assign smart bin',
    variant: 'ghost',
    visible: () => true,
  },
  {
    id: 'deactivate',
    icon: 'ban',
    label: 'Deactivate collector',
    variant: 'danger',
    visible: (row: CollectorListItem) => row.status === AccountStatus.Active,
  },
];

export const CREDENTIALS_MODE_OPTIONS: SegmentedOption<CollectorCredentialsMode>[] = [
  { label: 'Invite link', value: CollectorCredentialsMode.InviteLink },
  { label: 'Temporary password', value: CollectorCredentialsMode.TemporaryPassword },
];

export function getCollectorStatusBadgeVariant(status: unknown): BadgeVariant {
  switch (status) {
    case AccountStatus.Active:
      return 'success';
    case AccountStatus.Inactive:
    default:
      return 'neutral';
  }
}

export function getCollectorStatusLabel(status: unknown): string {
  if (typeof status === 'string' && Object.prototype.hasOwnProperty.call(ACCOUNT_STATUS_LABELS, status)) {
    return ACCOUNT_STATUS_LABELS[status as AccountStatus];
  }
  return String(status ?? '');
}
