import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Icon, IconName, IconSize } from '@shared/components/icon/icon';
import { TooltipDirective, TooltipPosition } from '@shared/components/tooltip/tooltip.directive';
import { ButtonSize, ButtonVariant } from '../button';

@Component({
  selector: 'app-icon-button',
  imports: [Icon, TooltipDirective],
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IconButton {
  readonly icon = input.required<IconName | string>();
  readonly variant = input<ButtonVariant>('ghost');
  readonly size = input<ButtonSize>('md');
  readonly title = input<string>('');
  readonly tooltipPosition = input<TooltipPosition>('top');
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
