import { Component, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { Button } from '../button/button';

@Component({
  selector: 'app-empty-state',
  imports: [Icon, Button],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.css',
})
export class EmptyState {
  readonly icon = input<IconName | string>('recycle');
  readonly title = input<string>('No items found');
  readonly description = input<string>('There is no data to display right now.');
  readonly actionText = input<string>('');
  readonly actionIcon = input<IconName | string | null | undefined>();

  readonly actionClicked = output<void>();

  handleAction(): void {
    this.actionClicked.emit();
  }
}
