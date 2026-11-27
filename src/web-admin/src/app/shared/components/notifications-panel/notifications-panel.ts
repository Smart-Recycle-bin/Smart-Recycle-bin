import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Id } from '@models/common/id.model';
import { formatDateTime } from '@shared/utils/datetime';
import { Icon, IconName } from '../icon/icon';

export type NotificationType = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationItem {
  id: Id;
  title: string;
  message?: string;
  time: string;
  unread?: boolean;
  type?: NotificationType;
  sourceType?: string;
  sourceReferenceId?: string | null;
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
  readonly errorText = input<string | null>(null);

  readonly itemClicked = output<NotificationItem>();
  readonly markRead = output<Id>();
  readonly markAllRead = output<void>();
  readonly retry = output<void>();

  readonly hasUnread = computed(() => this.items().some((item) => !!item.unread));

  formatTime(value: string): string {
    const formatted = formatDateTime(value);
    return formatted !== '—' ? formatted : value;
  }

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
