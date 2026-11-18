import { Component, input, output } from '@angular/core';
import { Icon } from '@shared/components/icon/icon';

@Component({
  selector: 'app-search-input',
  imports: [Icon],
  templateUrl: './search-input.html',
  styleUrl: './search-input.css',
})
export class SearchInput {
  readonly placeholder = input<string>('Search...');
  readonly value = input<string>('');
  readonly disabled = input<boolean>(false);
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly ariaLabel = input<string>('Search');

  readonly valueChange = output<string>();
  readonly search = output<string>();
  readonly cleared = output<void>();

  handleInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.valueChange.emit(val);
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.search.emit(this.value());
    } else if (event.key === 'Escape') {
      this.clear();
    }
  }

  clear(): void {
    if (this.disabled()) return;
    this.valueChange.emit('');
    this.cleared.emit();
  }
}
