import { Component, ElementRef, effect, input, output, viewChild } from '@angular/core';
import { Icon } from '../../icon/icon';

@Component({
  selector: 'app-checkbox',
  imports: [Icon],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
})
export class Checkbox {
  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly checked = input<boolean>(false);
  readonly indeterminate = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`checkbox-${Math.random().toString(36).substring(2, 9)}`);

  readonly checkedChange = output<boolean>();

  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  constructor() {
    effect(() => {
      const el = this.inputElement()?.nativeElement;
      if (el) {
        el.indeterminate = this.indeterminate();
      }
    });
  }

  handleChange(event: Event): void {
    if (this.disabled()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.checkedChange.emit(isChecked);
  }
}
