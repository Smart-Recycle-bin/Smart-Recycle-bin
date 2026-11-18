import {
  Component,
  input,
  output,
} from '@angular/core';
import { IconButton } from '@shared/components/button/icon-button/icon-button';
import { FocusTrapDirective } from '@shared/directives/focus-trap.directive';

export type DrawerPosition = 'left' | 'right';
export type DrawerSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-drawer',
  imports: [IconButton, FocusTrapDirective],
  templateUrl: './drawer.html',
  styleUrl: './drawer.css',
})
export class Drawer {
  readonly titleId = `drawer-title-${Math.random().toString(36).substring(2, 9)}`;
  readonly descId = `drawer-desc-${Math.random().toString(36).substring(2, 9)}`;

  readonly open = input<boolean>(false);
  readonly title = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly description = input<string>('');
  readonly position = input<DrawerPosition>('right');
  readonly size = input<DrawerSize>('md');
  readonly closeOnBackdrop = input<boolean>(true);

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
