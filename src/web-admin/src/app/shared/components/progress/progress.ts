import { Component, computed, input } from '@angular/core';

export type ProgressColor = 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type ProgressSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-progress',
  imports: [],
  templateUrl: './progress.html',
  styleUrl: './progress.css',
})
export class Progress {
  readonly value = input<number>(0);
  readonly max = input<number>(100);
  readonly label = input<string>('');
  readonly valueText = input<string>('');
  readonly color = input<ProgressColor>('brand');
  readonly size = input<ProgressSize>('md');
  readonly animated = input<boolean>(false);
  readonly showValue = input<boolean>(false);

  readonly clampedValue = computed(() => {
    const val = Math.max(0, Math.min(this.value(), this.max()));
    return val;
  });

  readonly percentage = computed<number>(() => {
    const maxVal = this.max() <= 0 ? 100 : this.max();
    return Math.round((this.clampedValue() / maxVal) * 100);
  });

  readonly displayValue = computed<string>(() => {
    if (this.valueText()) return this.valueText();
    return `${this.percentage()}%`;
  });
}
