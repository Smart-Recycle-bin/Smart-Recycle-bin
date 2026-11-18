import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from '@shared/components/icon/icon';
import { FormField } from '../form-field/form-field';
import { SelectOption } from '../select/select';
import { bindNgControlState } from '../form-control.utils';

@Component({
  selector: 'app-async-select',
  imports: [Icon, FormField],
  templateUrl: './async-select.html',
  styleUrl: './async-select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AsyncSelect implements ControlValueAccessor, OnInit {
  private readonly ngControl = inject(NgControl, { self: true, optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject(ElementRef);

  readonly label = input<string>('');
  readonly placeholder = input<string>('Search or select...');
  readonly value = input<string | number>('');
  readonly fetcher = input<((term: string) => import('rxjs').Observable<SelectOption[]>) | undefined>(undefined);
  readonly search = input<((term: string) => import('rxjs').Observable<SelectOption[]>) | undefined>(undefined);
  readonly compact = input<boolean>(false);
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly id = input<string>(`async-select-${Math.random().toString(36).substring(2, 9)}`);
  readonly ariaLabel = input<string>('');
  readonly debounceMs = input<number>(300);

  readonly valueChange = output<string | number>();

  readonly internalValue = linkedSignal<string | number>(() => this.value());
  readonly internalDisabled = linkedSignal(() => this.disabled());
  readonly controlError = signal<string>('');
  readonly touched = signal<boolean>(false);
  readonly dirty = signal<boolean>(false);

  readonly isOpen = signal<boolean>(false);
  readonly isLoading = signal<boolean>(false);
  readonly options = signal<SelectOption[]>([]);
  readonly activeIndex = signal<number>(-1);
  readonly displayLabel = signal<string>('');
  readonly searchTerm = signal<string>('');

  private hasFetchedOnce = false;
  private readonly searchSubject$ = new Subject<string>();

  private onChange: (val: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  readonly effectiveError = computed(() => this.error() || this.controlError());
  readonly effectiveFetcher = computed(() => this.search() ?? this.fetcher());
  readonly listboxId = computed(() => `${this.id()}-listbox`);
  readonly activeOptionId = computed(() => {
    const idx = this.activeIndex();
    return idx >= 0 ? `${this.id()}-opt-${idx}` : undefined;
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

    this.searchSubject$
      .pipe(
        debounceTime(this.debounceMs()),
        distinctUntilChanged(),
        tap(() => this.isLoading.set(true)),
        switchMap((term) => {
          const fetchFn = this.effectiveFetcher();
          if (!fetchFn) {
            return of([]);
          }
          return fetchFn(term);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (opts) => {
          this.options.set(opts);
          this.isLoading.set(false);
          this.hasFetchedOnce = true;

          // If current value is set, try resolving displayLabel from fetched options
          const currentVal = this.internalValue();
          if (currentVal) {
            const found = opts.find((o) => String(o.value) === String(currentVal));
            if (found && !this.isOpen()) {
              this.displayLabel.set(found.label);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  writeValue(val: string | number | null): void {
    const safeVal = val ?? '';
    this.internalValue.set(safeVal);
    if (!safeVal) {
      this.displayLabel.set('');
      this.searchTerm.set('');
    } else {
      const found = this.options().find((o) => String(o.value) === String(safeVal));
      if (found) {
        this.displayLabel.set(found.label);
      } else if (!this.displayLabel()) {
        this.displayLabel.set(String(safeVal));
      }
    }
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

  openDropdown(): void {
    if (this.internalDisabled() || this.isOpen()) return;
    this.isOpen.set(true);
    this.activeIndex.set(-1);

    if (!this.hasFetchedOnce || this.options().length === 0) {
      this.triggerFetch('');
    }
  }

  closeDropdown(): void {
    if (!this.isOpen()) return;
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.markTouched();

    // Reset input text to displayLabel if not empty, or empty
    const currentVal = this.internalValue();
    if (currentVal) {
      const found = this.options().find((o) => String(o.value) === String(currentVal));
      if (found) {
        this.displayLabel.set(found.label);
      }
    } else {
      this.displayLabel.set('');
    }
  }

  onInput(event: Event): void {
    const term = (event.target as HTMLInputElement).value;
    this.searchTerm.set(term);
    this.displayLabel.set(term);
    if (!this.isOpen()) {
      this.isOpen.set(true);
    }
    this.searchSubject$.next(term);
  }

  selectOption(option: SelectOption): void {
    if (option.disabled || this.internalDisabled()) return;

    this.internalValue.set(option.value);
    this.displayLabel.set(option.label);
    this.searchTerm.set('');
    this.dirty.set(true);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
    this.closeDropdown();
  }

  clearSelection(event?: Event): void {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (this.internalDisabled()) return;

    this.internalValue.set('');
    this.displayLabel.set('');
    this.searchTerm.set('');
    this.dirty.set(true);
    this.onChange('');
    this.valueChange.emit('');
    this.closeDropdown();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.internalDisabled()) return;

    const opts = this.options();
    const len = opts.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.openDropdown();
        } else if (len > 0) {
          const next = this.activeIndex() + 1;
          this.activeIndex.set(next < len ? next : 0);
          this.scrollActiveIntoView();
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (this.isOpen() && len > 0) {
          const prev = this.activeIndex() - 1;
          this.activeIndex.set(prev >= 0 ? prev : len - 1);
          this.scrollActiveIntoView();
        }
        break;

      case 'Enter':
        if (this.isOpen()) {
          event.preventDefault();
          const active = this.activeIndex();
          if (active >= 0 && active < len) {
            this.selectOption(opts[active]);
          }
        }
        break;

      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.closeDropdown();
        }
        break;

      case 'Tab':
        if (this.isOpen()) {
          this.closeDropdown();
        }
        break;
    }
  }

  onBlur(): void {
    // Let click events on options resolve first
    setTimeout(() => {
      this.closeDropdown();
    }, 150);
  }

  isSelected(opt: SelectOption): boolean {
    return String(opt.value) === String(this.internalValue());
  }

  getOptionId(index: number): string {
    return `${this.id()}-opt-${index}`;
  }

  private triggerFetch(term: string): void {
    this.isLoading.set(true);
    const fetchFn = this.effectiveFetcher();
    if (!fetchFn) {
      this.isLoading.set(false);
      return;
    }
    fetchFn(term)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (opts) => {
          this.options.set(opts);
          this.isLoading.set(false);
          this.hasFetchedOnce = true;
          const currentVal = this.internalValue();
          if (currentVal) {
            const found = opts.find((o) => String(o.value) === String(currentVal));
            if (found) {
              this.displayLabel.set(found.label);
            }
          }
        },
        error: () => {
          this.isLoading.set(false);
        },
      });
  }

  private markTouched(): void {
    if (!this.touched()) {
      this.touched.set(true);
      this.onTouched();
    }
  }

  private scrollActiveIntoView(): void {
    const activeId = this.activeOptionId();
    if (!activeId) return;
    const el = this.elementRef.nativeElement.querySelector(`#${activeId}`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) return;
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.closeDropdown();
    }
  }
}
