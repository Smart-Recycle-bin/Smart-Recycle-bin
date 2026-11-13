export const NotificationType = {
  Info: 'info',
  Success: 'success',
  Warning: 'warning',
  Danger: 'danger',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.Info]: 'Information',
  [NotificationType.Success]: 'Success',
  [NotificationType.Warning]: 'Warning',
  [NotificationType.Danger]: 'Danger',
};
