import { Component, computed, input } from '@angular/core';

export interface BarListItem {
  label: string;
  value: number;
  color?: string;
  formattedValue?: string;
}

@Component({
  selector: 'app-bar-list',
  imports: [],
  templateUrl: './bar-list.html',
  styleUrl: './bar-list.css',
})
export class BarList {
  readonly items = input<BarListItem[]>([]);
  readonly title = input<string>('');
  readonly showPercentage = input<boolean>(true);
  readonly defaultColor = input<string>('#009966');
  readonly unit = input<string>('');

  readonly maxValue = computed(() => {
    const list = this.items();
    if (!list || list.length === 0) return 1;
    const max = Math.max(...list.map((i) => i.value));
    return max > 0 ? max : 1;
  });

  readonly totalValue = computed(() => {
    const list = this.items();
    if (!list || list.length === 0) return 0;
    return list.reduce((acc, curr) => acc + curr.value, 0);
  });

  readonly processedItems = computed(() => {
    const max = this.maxValue();
    const total = this.totalValue() || 1;
    return this.items().map((item) => {
      const percentageOfMax = Math.round((item.value / max) * 100);
      const percentageOfTotal = Math.round((item.value / total) * 100);
      return {
        ...item,
        barWidth: Math.max(3, percentageOfMax),
        percentageOfTotal,
        displayVal: item.formattedValue || `${item.value}${this.unit() ? ' ' + this.unit() : ''}`,
        barColor: item.color || this.defaultColor(),
      };
    });
  });
}
