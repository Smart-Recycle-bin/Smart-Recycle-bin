import { Component, computed, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-button',
  imports: [Icon],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);
  readonly leadingIcon = input<IconName | string | null | undefined>();
  readonly trailingIcon = input<IconName | string | null | undefined>();
  readonly ariaLabel = input<string | null | undefined>();

  readonly clicked = output<MouseEvent>();

  readonly isDisabled = computed(() => this.disabled() || this.loading());

  readonly iconSize = computed<'sm' | 'md' | 'lg'>(() => {
    switch (this.size()) {
      case 'sm':
        return 'sm';
      case 'lg':
        return 'md';
      default:
        return 'sm';
    }
  });

  handleClick(event: MouseEvent): void {
    if (this.isDisabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.clicked.emit(event);
  }
}
