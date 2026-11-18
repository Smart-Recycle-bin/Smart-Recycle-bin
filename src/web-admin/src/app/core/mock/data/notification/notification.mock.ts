import { NotificationType } from '@models/notification/notification-type.enum';
import { NotificationItem } from '@models/notification/notification.view-model';

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  // 9 unread notifications matching the topbar bell badge count (9) on all PDF screens
  {
    id: 'notif-01',
    title: 'Bin #0007 Capacity Alert',
    message: 'Tahrir Square North reached 97% capacity (Needs Servicing).',
    time: '10m ago',
    unread: true,
    type: NotificationType.Danger,
  },
  {
    id: 'notif-02',
    title: 'Bin #0038 Capacity Alert',
    message: 'Ain Shams University reached 96% capacity.',
    time: '25m ago',
    unread: true,
    type: NotificationType.Danger,
  },
  {
    id: 'notif-03',
    title: 'Bin #0061 Capacity Alert',
    message: 'Shubra El Kheima Market reached 99% capacity.',
    time: '42m ago',
    unread: true,
    type: NotificationType.Danger,
  },
  {
    id: 'notif-04',
    title: 'New AI Review Flagged',
    message: 'Report AIR-2048 flagged for manual verification in Bin #0042.',
    time: '1h ago',
    unread: true,
    type: NotificationType.Warning,
  },
  {
    id: 'notif-05',
    title: 'Contamination Hotspot Alert',
    message: 'Mixed packaging rejection rate rose to 19.4% in current period.',
    time: '2h ago',
    unread: true,
    type: NotificationType.Warning,
  },
  {
    id: 'notif-06',
    title: 'Bin #0095 Offline',
    message: 'Borg El Arab Hub has stopped responding to telemetry pings.',
    time: '3h ago',
    unread: true,
    type: NotificationType.Danger,
  },
  {
    id: 'notif-07',
    title: 'Reward Stock Depleted',
    message: 'Vodafone 1GB Data Bundle (RWD-003) is now Out of Stock.',
    time: '4h ago',
    unread: true,
    type: NotificationType.Info,
  },
  {
    id: 'notif-08',
    title: 'Suspicious Activity Detected',
    message: 'Account U-10063 flagged for duplicate session claims in Giza.',
    time: '5h ago',
    unread: true,
    type: NotificationType.Warning,
  },
  {
    id: 'notif-09',
    title: 'Retraining Dataset Progress',
    message: '1,285 images labelled. 215 remaining until scheduled retraining.',
    time: '6h ago',
    unread: true,
    type: NotificationType.Success,
  },
];
