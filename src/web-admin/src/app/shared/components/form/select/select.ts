import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '@shared/components/icon/icon';
import { FormField } from '../form-field/form-field';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

export interface SelectOption {
  label: string;
  value: string | number;
  disabled?: boolean;
}

@Component({
  selector: 'app-select',
  imports: [Icon, FormField],
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Select implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly placeholder = input<string>('Select an option...');
  readonly value = input<string | number>('');
  readonly options = input<SelectOption[]>([]);
  readonly compact = input<boolean>(false);
  readonly allowEmpty = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`select-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string | number>();

  readonly internalValue = linkedSignal<string | number>(() => this.value());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  private onChange: (val: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => this.error() || this.controlError());
  readonly isEmptyAllowed = computed(() => this.compact() || this.allowEmpty());
  readonly hasEmptyOption = computed(() =>
    this.options().some(
      (opt) => opt.value === '' || opt.value === null || opt.value === undefined
    )
  );

  readonly effectiveAriaLabel = computed(() => {
    if (this.ariaLabel()) return this.ariaLabel();
    if (this.compact() || !this.label()) {
      return this.label() || this.placeholder() || 'Select option';
    }
    return null;
  });

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

  writeValue(val: string | number | null): void {
    this.internalValue.set(val ?? '');
  }

  registerOnChange(fn: (val: string | number) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  handleChange(event: Event): void {
    const raw = (event.target as HTMLSelectElement).value;
    const matched = this.options().find((o) => String(o.value) === raw);
    const nextVal = matched ? matched.value : raw;
    this.internalValue.set(nextVal);
    this.dirty.set(true);
    this.onChange(nextVal);
    this.valueChange.emit(nextVal);
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }
}
