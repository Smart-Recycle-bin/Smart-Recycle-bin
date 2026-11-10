import { Component, computed, input, output, signal } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { IconButton } from '../button/icon-button/icon-button';

export type NoticeVariant = 'info' | 'success' | 'warning' | 'danger';

@Component({
  selector: 'app-notice',
  imports: [Icon, IconButton],
  templateUrl: './notice.html',
  styleUrl: './notice.css',
})
export class Notice {
  readonly variant = input<NoticeVariant>('info');
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly icon = input<IconName | string | null | undefined>();
  readonly dismissible = input<boolean>(false);
  readonly actionText = input<string>('');

  readonly dismissed = output<void>();
  readonly actionClicked = output<void>();

  readonly isVisible = signal<boolean>(true);

  readonly defaultIcon = computed<IconName>(() => {
    switch (this.variant()) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'alert';
      case 'danger':
        return 'alert-circle';
      default:
        return 'info';
    }
  });

  readonly effectiveIcon = computed<string>(() => {
    return this.icon() || this.defaultIcon();
  });

  handleDismiss(): void {
    this.isVisible.set(false);
    this.dismissed.emit();
  }

  handleAction(): void {
    this.actionClicked.emit();
  }
}
