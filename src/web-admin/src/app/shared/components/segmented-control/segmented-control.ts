import { ChangeDetectionStrategy, Component, input, linkedSignal, output } from '@angular/core';

export interface SegmentedOption<T extends string | number = string | number> {
  label: string;
  value: T;
  disabled?: boolean;
}

@Component({
  selector: 'app-segmented-control',
  imports: [],
  templateUrl: './segmented-control.html',
  styleUrl: './segmented-control.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedControl {
  readonly options = input.required<SegmentedOption[]>();
  readonly value = input<string | number | undefined>(undefined);
  readonly size = input<'sm' | 'md'>('md');
  readonly ariaLabel = input<string>('Options');

  readonly valueChange = output<string | number>();

  readonly activeValue = linkedSignal(() => {
    const v = this.value();
    if (v !== undefined) return v;
    return this.options()[0]?.value;
  });

  select(opt: SegmentedOption): void {
    if (opt.disabled) return;
    this.activeValue.set(opt.value);
    this.valueChange.emit(opt.value);
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    const opts = this.options();
    if (!opts.length) return;

    let nextIndex = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % opts.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + opts.length) % opts.length;
    }

    if (nextIndex >= 0) {
      event.preventDefault();
      const target = opts[nextIndex];
      if (!target.disabled) {
        this.select(target);
        const btns = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
        (btns?.[nextIndex] as HTMLButtonElement | undefined)?.focus();
      }
    }
  }
}
