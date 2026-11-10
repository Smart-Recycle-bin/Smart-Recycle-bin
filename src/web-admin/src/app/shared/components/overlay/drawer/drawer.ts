import { Component, HostListener, input, output } from '@angular/core';
import { IconButton } from '../../button/icon-button/icon-button';

export type DrawerPosition = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-drawer',
  imports: [IconButton],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
})
export class Drawer {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly position = input<DrawerPosition>('right');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);

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
