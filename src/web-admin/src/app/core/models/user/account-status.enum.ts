export const AccountStatus = {
  Active: 'active',
  Suspended: 'suspended',
  Banned: 'banned',     // PROPOSED (UI p5)
  Inactive: 'inactive', // PROPOSED (UI p6)
} as const;

export type AccountStatus = (typeof AccountStatus)[keyof typeof AccountStatus];

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  [AccountStatus.Active]: 'Active',
  [AccountStatus.Suspended]: 'Suspended',
  [AccountStatus.Banned]: 'Banned',
  [AccountStatus.Inactive]: 'Inactive',
};
