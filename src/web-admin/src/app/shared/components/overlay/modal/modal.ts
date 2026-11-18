import {
  Component,
  input,
  output,
} from '@angular/core';
import { IconButton } from '@shared/components/button/icon-button/icon-button';
import { FocusTrapDirective } from '@shared/directives/focus-trap.directive';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  imports: [IconButton, FocusTrapDirective],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;
  readonly descId = `modal-desc-${Math.random().toString(36).substring(2, 9)}`;

  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly description = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly showCloseButton = input<boolean>(true);

  readonly closed = output<void>();

  close(): void {
    this.closed.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.close();
    }
  }
}
