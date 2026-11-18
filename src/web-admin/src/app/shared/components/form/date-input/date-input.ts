import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '@shared/components/icon/icon';
import { FormField } from '../form-field/form-field';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

export type DateDisplayFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';

export function formatIsoDate(iso: string | null | undefined, format: DateDisplayFormat): string {
  if (!iso) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  const [, yyyy, mm, dd] = match;
  switch (format) {
    case 'mm/dd/yyyy':
      return `${mm}/${dd}/${yyyy}`;
    case 'yyyy-mm-dd':
      return `${yyyy}-${mm}-${dd}`;
    case 'dd/mm/yyyy':
    default:
      return `${dd}/${mm}/${yyyy}`;
  }
}

@Component({
  selector: 'app-date-input',
  imports: [Icon, FormField],
  templateUrl: './date-input.html',
  styleUrl: './date-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateInput implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly ariaLabel = input<string>('');
  readonly value = input<string | null>(null);
  readonly displayFormat = input<DateDisplayFormat>('dd/mm/yyyy');
  readonly placeholder = input<string>('');
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
  readonly compact = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`date-${Math.random().toString(36).substring(2, 9)}`);

  readonly valueChange = output<string | null>();

  readonly nativeInput = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  readonly internalValue = linkedSignal<string | null>(() => this.value());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  private onChange: (val: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => this.error() || this.controlError());
  readonly effectivePlaceholder = computed(() => this.placeholder() || this.displayFormat());
  readonly formattedValue = computed(() =>
    formatIsoDate(this.internalValue(), this.displayFormat())
  );

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
    this.internalValue.set(val ?? null);
  }

  registerOnChange(fn: (val: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  handleChange(event: Event): void {
    const raw = (event.target as HTMLInputElement).value;
    const next = raw ? raw : null;
    this.internalValue.set(next);
    this.dirty.set(true);
    this.onChange(next);
    this.valueChange.emit(next);
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  openPicker(): void {
    if (this.internalDisabled()) return;
    const el = this.nativeInput()?.nativeElement;
    if (!el) return;
    el.focus();
    if (typeof el.showPicker === 'function') {
      try {
        el.showPicker();
      } catch {
        // showPicker may be blocked in non-gesture contexts
      }
    }
  }
}
