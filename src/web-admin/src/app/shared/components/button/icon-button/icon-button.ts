import { Component, computed, input, output } from '@angular/core';
import { Icon, IconName, IconSize } from '../../icon/icon';
import { ButtonSize, ButtonVariant } from '../button';

@Component({
  selector: 'app-icon-button',
  imports: [Icon],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.css',
})
export class IconButton {
  readonly icon = input.required<IconName | string>();
  readonly variant = input<ButtonVariant>('ghost');
  readonly size = input<ButtonSize>('md');
  readonly title = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);

  readonly clicked = output<MouseEvent>();

  readonly effectiveLabel = computed(() => this.ariaLabel() || this.title() || 'Action');

  readonly isDisabled = computed(() => this.disabled() || this.loading());

  readonly iconSize = computed<IconSize>(() => {
    switch (this.size()) {
      case 'sm':
        return 'sm';
      case 'lg':
        return 'lg';
      default:
        return 'md';
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
