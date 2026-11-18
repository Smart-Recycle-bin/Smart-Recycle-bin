import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ThemeService } from '@services/theme/theme.service';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  imports: [],
  templateUrl: './donut-chart.html',
  styleUrl: './donut-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DonutChart {
  private readonly themeService = inject(ThemeService, { optional: true });

  readonly data = input<DonutSegment[]>([]);
  readonly title = input<string>('');
  readonly centerLabel = input<string>('Total');
  readonly centerValue = input<string | number | null>(null);
  readonly unit = input<string>('');
  readonly showLegend = input<boolean>(true);

  readonly hoveredIndex = signal<number | null>(null);

  readonly radius = 38;
  readonly strokeWidth = 14;
  readonly circumference = 2 * Math.PI * 38; // ~238.76

  readonly totalValue = computed(() => {
    const list = this.data();
    if (!list || list.length === 0) return 0;
    return list.reduce((sum, item) => sum + item.value, 0);
  });

  readonly hasData = computed(() => this.totalValue() > 0);

  readonly segments = computed(() => {
    // Read theme signal so theme toggle triggers re-render
    this.themeService?.theme();

    const list = this.data();
    const total = this.totalValue();
    if (!list || total === 0) return [];

    let accumulatedOffset = 0;

    return list.map((item, index) => {
      const fraction = item.value / total;
      const strokeDasharray = `${(fraction * this.circumference).toFixed(2)} ${(this.circumference * (1 - fraction)).toFixed(2)}`;
      const strokeDashoffset = (-accumulatedOffset * this.circumference).toFixed(2);
      accumulatedOffset += fraction;

      const percentage = Math.round(fraction * 100);

      return {
        ...item,
        index,
        percentage,
        strokeDasharray,
        strokeDashoffset,
      };
    });
  });

  readonly activeItem = computed(() => {
    const idx = this.hoveredIndex();
    if (idx !== null && this.segments()[idx]) {
      return this.segments()[idx];
    }
    return null;
  });

  onSegmentHover(index: number | null): void {
    this.hoveredIndex.set(index);
  }
}
