import {
  Component,
  ElementRef,
  HostListener,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { IconButton } from '../../button/icon-button/icon-button';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

@Component({
  selector: 'app-modal',
  imports: [IconButton],
  templateUrl: './modal.html',
  styleUrl: './modal.css',
})
export class Modal {
  private readonly elementRef = inject(ElementRef);
  private previousActiveElement: HTMLElement | null = null;

  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly size = input<ModalSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);
  readonly showCloseButton = input<boolean>(true);

  readonly closed = output<void>();

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (isOpen) {
        if (typeof document !== 'undefined') {
          this.previousActiveElement = document.activeElement as HTMLElement;
          setTimeout(() => {
            const host = this.elementRef.nativeElement as HTMLElement;
            const focusables = host.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            if (focusables.length > 0) {
              focusables[0].focus();
            } else {
              const panel = host.querySelector<HTMLElement>('.modal-panel');
              panel?.focus();
            }
          }, 50);
        }
      } else {
        if (this.previousActiveElement && typeof this.previousActiveElement.focus === 'function') {
          this.previousActiveElement.focus();
          this.previousActiveElement = null;
        }
      }
    });
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.open()) return;

    if (event.key === 'Tab') {
      const host = this.elementRef.nativeElement as HTMLElement;
      const focusables = Array.from(
        host.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);

      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (document.activeElement === first || !host.contains(document.activeElement)) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last || !host.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

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
