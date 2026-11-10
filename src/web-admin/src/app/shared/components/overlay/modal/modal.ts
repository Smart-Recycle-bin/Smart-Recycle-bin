import { Component, HostListener, input, output } from '@angular/core';
import { IconButton } from '../../button/icon-button/icon-button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-modal',
  imports: [IconButton],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly showCloseButton = input<boolean>(true);

  readonly closed = output<void>();

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event?: Event): void {
    if (this.open()) {
      event?.preventDefault();
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  handleBackdropClick(event: MouseEvent): void {
    if (this.closeOnBackdrop() && event.target === event.currentTarget) {
      this.close();
    }
  }
}
