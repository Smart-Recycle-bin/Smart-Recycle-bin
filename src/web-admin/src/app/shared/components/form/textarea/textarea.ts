import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-textarea',
  imports: [],
  templateUrl: './textarea.html',
  styleUrl: './textarea.css',
})
export class Textarea {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly rows = input<number>(3);
  readonly maxLength = input<number | null>(null);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`textarea-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string>();

  readonly charCount = computed(() => this.value()?.length || 0);

  handleInput(event: Event): void {
    const val = (event.target as HTMLTextAreaElement).value;
    this.valueChange.emit(val);
  }
}
