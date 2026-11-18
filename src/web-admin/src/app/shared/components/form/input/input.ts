import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon, IconName } from '@shared/components/icon/icon';
import { FormField } from '../form-field/form-field';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

@Component({
  selector: 'app-input',
  imports: [Icon, FormField],
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Input implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly placeholder = input<string>('');
  readonly type = input<string>('text');
  readonly value = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly autocomplete = input<string>('');
  readonly autofocus = input<boolean>(false);
  readonly leadingIcon = input<IconName | string | null | undefined>();
  readonly trailingIcon = input<IconName | string | null | undefined>();
  readonly id = input<string>(`input-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string>();

  readonly internalValue = linkedSignal(() => this.value());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);
  readonly showPassword = model<boolean>(false);

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => this.error() || this.controlError());

  readonly actualType = computed(() => {
    if (this.type() === 'password') {
      return this.showPassword() ? 'text' : 'password';
    }
    return this.type();
  });

  readonly isPassword = computed(() => this.type() === 'password');

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    if (this.ngControl) {
      bindNgControlState(
        this.ngControl,
        this.destroyRef,
        this.controlError,
        this.touched,
        this.dirty
      );
    }
  }

  writeValue(val: string | null): void {
    this.internalValue.set(val ?? '');
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  handleInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.internalValue.set(val);
    this.dirty.set(true);
    this.onChange(val);
    this.valueChange.emit(val);
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}
