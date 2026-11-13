// GAP: see gap_api.md → System Notifications Feed (UI shell, all screens)
import { Id } from '../common/id.model';
import { NotificationType } from './notification-type.enum';

/**
 * Single notification item matching the contract required by notifications-panel.
 */
export interface NotificationItem {
  id: Id;
  title: string;
  message?: string;
  time: string;
  unread?: boolean;
  type?: NotificationType;
}

/**
 * Topbar notifications feed response with unread badge counter.
 */
export interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}
