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
import { DateDisplayFormat, DateInput } from '../date-input/date-input';
import { FormField } from '../form-field/form-field';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

export interface DateRangeValue {
  from: string | null;
  to: string | null;
}

@Component({
  selector: 'app-date-range-input',
  imports: [DateInput, FormField],
  templateUrl: './date-range-input.html',
  styleUrl: './date-range-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangeInput implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly value = input<DateRangeValue>({ from: null, to: null });
  readonly displayFormat = input<DateDisplayFormat>('dd/mm/yyyy');
  readonly compact = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly separator = input<string>('to');

  readonly valueChange = output<DateRangeValue>();

  readonly internalValue = linkedSignal<DateRangeValue>(() => this.value());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  private onChange: (val: DateRangeValue) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => {
    if (this.isInverted()) {
      return 'Start date cannot be after end date';
    }
    return this.error() || this.controlError();
  });

  readonly isInverted = computed(() => {
    const v = this.internalValue();
    return !!(v.from && v.to && v.from > v.to);
  });

  swapDates(): void {
    const v = this.internalValue();
    if (!v.from || !v.to) return;
    const next: DateRangeValue = { from: v.to, to: v.from };
    this.emitNext(next);
  }

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

  writeValue(val: DateRangeValue | null): void {
    this.internalValue.set(val ? { from: val.from ?? null, to: val.to ?? null } : { from: null, to: null });
  }

  registerOnChange(fn: (val: DateRangeValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  updateFrom(from: string | null): void {
    const next: DateRangeValue = { ...this.internalValue(), from };
    this.emitNext(next);
  }

  updateTo(to: string | null): void {
    const next: DateRangeValue = { ...this.internalValue(), to };
    this.emitNext(next);
  }

  handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  private emitNext(next: DateRangeValue): void {
    this.internalValue.set(next);
    this.dirty.set(true);
    this.onChange(next);
    this.valueChange.emit(next);
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }
}
