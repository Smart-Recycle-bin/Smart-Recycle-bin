import { Component, input, output } from '@angular/core';
import { Modal } from '../modal/modal';
import { Button } from '@shared/components/button/button';
import { Icon } from '@shared/components/icon/icon';

@Component({
  selector: 'app-confirm-dialog',
  imports: [Modal, Button, Icon],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  readonly open = input<boolean>(false);
  readonly title = input<string>('Confirm Action');
  readonly description = input<string>('Are you sure you want to proceed? This action cannot be undone.');
  readonly confirmText = input<string>('Confirm');
  readonly cancelText = input<string>('Cancel');
  readonly danger = input<boolean>(false);
  readonly loading = input<boolean>(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  handleConfirm(): void {
    if (this.loading()) return;
    this.confirmed.emit();
  }

  handleCancel(): void {
    if (this.loading()) return;
    this.cancelled.emit();
  }
}
