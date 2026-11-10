import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-toggle',
  imports: [],
  templateUrl: './toggle.html',
  styleUrl: './toggle.css',
})
export class Toggle {
  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly size = input<'sm' | 'md'>('md');
  readonly id = input<string>(`toggle-${Math.random().toString(36).substring(2, 9)}`);

  readonly checkedChange = output<boolean>();

  toggle(): void {
    if (this.disabled()) return;
    this.checkedChange.emit(!this.checked());
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      this.toggle();
    }
  }
}
