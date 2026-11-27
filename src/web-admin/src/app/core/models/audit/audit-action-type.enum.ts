export const AuditActionType = {
  BinAssignment: 'BIN_ASSIGN',
  FleetUpdate: 'FLEET_UPDATE',
  BinRegistration: 'BIN_REGISTER',
  LedgerAdjustment: 'LEDGER_ADJUSTMENT',
  UserSuspension: 'USER_SUSPEND',
  UserUnsuspension: 'USER_UNSUSPEND',
  CatalogChange: 'CATALOG_CHANGE',
  RewardCreate: 'REWARD_CREATE',
  RewardUpdate: 'REWARD_UPDATE',
  RewardArchive: 'REWARD_ARCHIVE',
  CollectorProvisioning: 'COLLECTOR_PROVISION',
  CollectorUpdate: 'COLLECTOR_UPDATE',
  CollectorDeactivation: 'COLLECTOR_DEACTIVATE',
  InspectionCorrect: 'INSPECTION_CORRECT',
  InspectionDismiss: 'INSPECTION_DISMISS',
  InspectionRetrain: 'INSPECTION_RETRAIN',
  UserBan: 'USER_BAN', // PROPOSED (UI p16)
} as const;

export type AuditActionType = (typeof AuditActionType)[keyof typeof AuditActionType];

export const AUDIT_ACTION_TYPE_LABELS: Record<AuditActionType, string> = {
  [AuditActionType.BinAssignment]: 'Bin Assignment',
  [AuditActionType.FleetUpdate]: 'Fleet Update',
  [AuditActionType.BinRegistration]: 'Bin Registration',
  [AuditActionType.LedgerAdjustment]: 'Ledger Adjustment',
  [AuditActionType.UserSuspension]: 'User Suspension',
  [AuditActionType.UserUnsuspension]: 'User Unsuspension',
  [AuditActionType.CatalogChange]: 'Catalog Change',
  [AuditActionType.RewardCreate]: 'Reward Created',
  [AuditActionType.RewardUpdate]: 'Reward Updated',
  [AuditActionType.RewardArchive]: 'Reward Archived',
  [AuditActionType.CollectorProvisioning]: 'Collector Provisioning',
  [AuditActionType.CollectorUpdate]: 'Collector Updated',
  [AuditActionType.CollectorDeactivation]: 'Collector Deactivated',
  [AuditActionType.InspectionCorrect]: 'Inspection Corrected',
  [AuditActionType.InspectionDismiss]: 'Inspection Dismissed',
  [AuditActionType.InspectionRetrain]: 'Inspection Retraining',
  [AuditActionType.UserBan]: 'User Ban',
};
