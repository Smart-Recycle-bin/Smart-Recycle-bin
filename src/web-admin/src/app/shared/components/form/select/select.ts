import { Component, input, output } from '@angular/core';
import { Icon } from '../../icon/icon';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  imports: [Icon],
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select {
  readonly label = input<string>('');
  readonly placeholder = input<string>('Select an option...');
  readonly value = input<string | number>('');
  readonly options = input<SelectOption[]>([]);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`select-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string | number>();

  handleChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    // Check if the original option value was a number
    const matched = this.options().find((o) => String(o.value) === val);
    this.valueChange.emit(matched ? matched.value : val);
  }
}
