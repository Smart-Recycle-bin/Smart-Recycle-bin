import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Icon } from '@shared/components/icon/icon';
import { bindNgControlState, syncNgControlState } from '../form-control.utils';

@Component({
  selector: 'app-checkbox',
  imports: [Icon],
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkbox implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);

  readonly label = input<string>('');
  readonly description = input<string>('');
  readonly checked = input<boolean>(false);
  readonly indeterminate = input<boolean>(false);
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly id = input<string>(`checkbox-${Math.random().toString(36).substring(2, 9)}`);

  readonly checkedChange = output<boolean>();

  readonly inputElement = viewChild<ElementRef<HTMLInputElement>>('nativeInput');

  readonly internalChecked = linkedSignal(() => this.checked());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  private onChange: (val: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => this.error() || this.controlError());

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }

    effect(() => {
      const el = this.inputElement()?.nativeElement;
      if (el) {
        el.indeterminate = this.indeterminate();
      }
    });
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

  writeValue(val: boolean | null): void {
    this.internalChecked.set(!!val);
  }

  registerOnChange(fn: (val: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.internalDisabled.set(isDisabled);
  }

  handleChange(event: Event): void {
    if (this.internalDisabled()) return;
    const isChecked = (event.target as HTMLInputElement).checked;
    this.internalChecked.set(isChecked);
    this.dirty.set(true);
    this.onChange(isChecked);
    this.checkedChange.emit(isChecked);
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }

  handleBlur(): void {
    this.touched.set(true);
    this.onTouched();
    syncNgControlState(this.ngControl, this.controlError, this.touched, this.dirty);
  }
}
