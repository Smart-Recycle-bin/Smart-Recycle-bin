import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '@services/theme/theme.service';

export type BarListTone = 'brand' | 'info' | 'warning' | 'danger' | 'purple';

export interface BarListItem {
  label: string;
  value: number;
  color?: string;
  tone?: BarListTone;
  formattedValue?: string;
}

export interface BarListThresholds {
  warning?: number;
  danger?: number;
}

const TONE_COLOR_MAP: Record<BarListTone, string> = {
  brand: 'var(--brand)',
  info: 'var(--info)',
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  purple: 'var(--purple)',
};

@Component({
  selector: 'app-bar-list',
  imports: [],
  templateUrl: './bar-list.html',
  styleUrl: './bar-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarList {
  private readonly themeService = inject(ThemeService, { optional: true });

  readonly items = input<BarListItem[]>([]);
  readonly title = input<string>('');
  readonly showPercentage = input<boolean>(true);
  readonly defaultColor = input<string>('var(--brand)');
  readonly unit = input<string>('');
  readonly thresholds = input<BarListThresholds | null>(null);

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
    // Read theme so theme toggle triggers re-rendering
    this.themeService?.theme();

    const max = this.maxValue();
    const total = this.totalValue() || 1;
    const rules = this.thresholds();

    return this.items().map((item) => {
      const percentageOfMax = Math.round((item.value / max) * 100);
      const percentageOfTotal = Math.round((item.value / total) * 100);
      return {
        ...item,
        barWidth: Math.max(3, percentageOfMax),
        percentageOfTotal,
        displayVal: item.formattedValue || `${item.value}${this.unit() ? ' ' + this.unit() : ''}`,
        barColor: this.resolveBarColor(item, rules),
      };
    });
  });

  private resolveBarColor(item: BarListItem, rules: BarListThresholds | null): string {
    if (item.color) return item.color;
    if (rules) {
      if (rules.danger !== undefined && item.value >= rules.danger) {
        return TONE_COLOR_MAP.danger;
      }
      if (rules.warning !== undefined && item.value >= rules.warning) {
        return TONE_COLOR_MAP.warning;
      }
    }
    if (item.tone) {
      return TONE_COLOR_MAP[item.tone];
    }
    return this.defaultColor();
  }
}
