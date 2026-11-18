import { TableColumn } from '@shared/components/table/data-table/data-table';
import { AuditLogRow } from '@models/audit/audit.view-model';
import {
  AuditActionType,
  AUDIT_ACTION_TYPE_LABELS,
} from '@models/audit/audit-action-type.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { SelectOption } from '@shared/components/form/select/select';

export const AUDIT_ACTION_BADGE_VARIANTS: Record<AuditActionType, BadgeVariant> = {
  [AuditActionType.BinAssignment]: 'info',
  [AuditActionType.FleetUpdate]: 'success',
  [AuditActionType.LedgerAdjustment]: 'purple',
  [AuditActionType.UserSuspension]: 'warning',
  [AuditActionType.CatalogChange]: 'info',
  [AuditActionType.CollectorProvisioning]: 'success',
  [AuditActionType.UserBan]: 'danger',
};

export const ACTION_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { label: 'All action types', value: '' },
  ...Object.entries(AUDIT_ACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export const AUDIT_TABLE_COLUMNS: TableColumn<AuditLogRow>[] = [
  {
    key: 'timestamp',
    label: 'Timestamp',
    sortable: true,
    value: (row) => (row.timestamp ? new Date(row.timestamp).getTime() : 0),
    width: '150px',
    nowrap: true,
  },
  {
    key: 'adminName',
    label: 'Admin',
    sortable: true,
  },
  {
    key: 'actionType',
    label: 'Action',
    align: 'center',
    sortable: true,
    width: '170px',
  },
  {
    key: 'resourceId',
    label: 'Resource',
    sortable: true,
    width: '130px',
    nowrap: true,
  },
  {
    key: 'justification',
    label: 'Justification',
    sortable: false,
  },
  {
    key: 'ipAddress',
    label: 'IP address',
    sortable: true,
    width: '120px',
    nowrap: true,
  },
];
