export const UserRole = {
  Citizen: 'USER_CITIZEN',
  Collector: 'OPS_COLLECTOR',
  Admin: 'SYS_ADMIN',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.Citizen]: 'Citizen',
  [UserRole.Collector]: 'Collector',
  [UserRole.Admin]: 'System Admin',
};
