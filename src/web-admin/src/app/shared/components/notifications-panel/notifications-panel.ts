import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationItem {
  id: string;
  title: string;
  message?: string;
  time: string;
  unread?: boolean;
  type?: NotificationType;
}

@Component({
  selector: 'app-notifications-panel',
  imports: [Icon],
  templateUrl: './notifications-panel.html',
  styleUrl: './notifications-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPanel {
  readonly items = input<NotificationItem[]>([]);
  readonly title = input<string>('Notifications');
  readonly emptyText = input<string>('No notifications');

  readonly itemClicked = output<NotificationItem>();
  readonly markRead = output<string>();
  readonly markAllRead = output<void>();

  readonly hasUnread = computed(() => this.items().some((item) => !!item.unread));

  getIcon(type: NotificationType | undefined): IconName {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert';
      case 'danger':
        return 'alert-circle';
      default:
        return 'info';
    }
  }

  handleItemClick(item: NotificationItem): void {
    this.itemClicked.emit(item);
    if (item.unread) {
      this.markRead.emit(item.id);
    }
  }
}
