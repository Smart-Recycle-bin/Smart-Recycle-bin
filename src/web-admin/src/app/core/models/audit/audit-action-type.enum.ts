export const AuditActionType = {
  BinAssignment: 'BIN_ASSIGN',
  FleetUpdate: 'FLEET_UPDATE',
  LedgerAdjustment: 'LEDGER_ADJUSTMENT',
  UserSuspension: 'USER_SUSPEND',
  CatalogChange: 'CATALOG_CHANGE',
  CollectorProvisioning: 'COLLECTOR_PROVISION',
  UserBan: 'USER_BAN', // PROPOSED (UI p16)
} as const;

export type AuditActionType = (typeof AuditActionType)[keyof typeof AuditActionType];

export const AUDIT_ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  [AuditActionType.BinAssignment]: 'Bin Assignment',
  [AuditActionType.FleetUpdate]: 'Fleet Update',
  [AuditActionType.LedgerAdjustment]: 'Ledger Adjustment',
  [AuditActionType.UserSuspension]: 'User Suspension',
  [AuditActionType.CatalogChange]: 'Catalog Change',
  [AuditActionType.CollectorProvisioning]: 'Collector Provisioning',
  [AuditActionType.UserBan]: 'User Ban',
};
