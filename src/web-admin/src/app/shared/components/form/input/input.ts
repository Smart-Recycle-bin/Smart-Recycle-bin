import { Component, computed, input, output, signal } from '@angular/core';
import { Icon, IconName } from '../../icon/icon';

@Component({
  selector: 'app-input',
  imports: [Icon],
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input {
  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly value = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly leadingIcon = input<IconName | string | null | undefined>();
  readonly trailingIcon = input<IconName | string | null | undefined>();
  readonly id = input<string>(`input-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string>();

  // support password toggle if type === 'password'
  readonly showPassword = signal<boolean>(false);

  readonly actualType = computed(() => {
    if (this.type() === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type();
  });

  readonly isPassword = computed(() => this.type() === 'password');

  handleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.valueChange.emit(target.value);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
