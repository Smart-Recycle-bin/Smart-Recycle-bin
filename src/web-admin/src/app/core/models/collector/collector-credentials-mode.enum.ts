export const CollectorCredentialsMode = {
  InviteLink: 'invite_link',
  TemporaryPassword: 'temporary_password',
} as const;

export type CollectorCredentialsMode =
  (typeof CollectorCredentialsMode)[keyof typeof CollectorCredentialsMode];

export const COLLECTOR_CREDENTIALS_MODE_LABELS: Record<CollectorCredentialsMode, string> = {
  [CollectorCredentialsMode.InviteLink]: 'Invite link',
  [CollectorCredentialsMode.TemporaryPassword]: 'Temporary password',
};
