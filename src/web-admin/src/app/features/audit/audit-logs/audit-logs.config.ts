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
  [AuditActionType.BinRegistration]: 'success',
  [AuditActionType.LedgerAdjustment]: 'purple',
  [AuditActionType.UserSuspension]: 'warning',
  [AuditActionType.UserUnsuspension]: 'success',
  [AuditActionType.CatalogChange]: 'info',
  [AuditActionType.RewardCreate]: 'success',
  [AuditActionType.RewardUpdate]: 'info',
  [AuditActionType.RewardArchive]: 'warning',
  [AuditActionType.CollectorProvisioning]: 'success',
  [AuditActionType.CollectorUpdate]: 'info',
  [AuditActionType.CollectorDeactivation]: 'danger',
  [AuditActionType.InspectionCorrect]: 'success',
  [AuditActionType.InspectionDismiss]: 'neutral',
  [AuditActionType.InspectionRetrain]: 'purple',
  [AuditActionType.UserBan]: 'danger',
};

export const ACTION_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { label: 'All action types', value: '' },
  ...Object.entries(AUDIT_ACTION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
];

export const AUDIT_RESOURCE_TYPE_LABELS: Record<string, string> = {
  USER: 'User',
  COLLECTOR: 'Collector',
  SMART_BIN: 'Smart Bin',
  REWARD: 'Reward',
  INSPECTION_REPORT: 'Inspection',
  WALLET: 'Wallet',
};

export const RESOURCE_TYPE_FILTER_OPTIONS: SelectOption[] = [
  { label: 'All resources', value: '' },
  { label: 'User', value: 'USER' },
  { label: 'Collector', value: 'COLLECTOR' },
  { label: 'Smart Bin', value: 'SMART_BIN' },
  { label: 'Reward', value: 'REWARD' },
  { label: 'Inspection Report', value: 'INSPECTION_REPORT' },
  { label: 'Wallet', value: 'WALLET' },
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
