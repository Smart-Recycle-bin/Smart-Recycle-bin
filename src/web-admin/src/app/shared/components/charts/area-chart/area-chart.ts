import { Component, computed, input, signal } from '@angular/core';

export interface AreaChartPoint {
  label: string;
  value: number;
}

@Component({
  selector: 'app-area-chart',
  imports: [],
  templateUrl: './area-chart.html',
  styleUrl: './area-chart.css',
})
export class AreaChart {
  readonly data = input<AreaChartPoint[]>([]);
  readonly title = input<string>('');
  readonly height = input<number>(200);
  readonly color = input<string>('#009966');
  readonly unit = input<string>('');
  readonly showGrid = input<boolean>(true);

  readonly hoveredIndex = signal<number | null>(null);

  protected readonly Math = Math;

  readonly width = 500;
  readonly padLeft = 45;
  readonly padRight = 15;
  readonly padTop = 20;
  readonly padBottom = 30;

  readonly chartId = `area-gradient-${Math.random().toString(36).substring(2, 9)}`;

  readonly hasData = computed(() => this.data() && this.data().length > 1);

  readonly plotWidth = computed(() => this.width - this.padLeft - this.padRight);
  readonly plotHeight = computed(() => this.height() - this.padTop - this.padBottom);

  readonly maxValue = computed(() => {
    if (!this.hasData()) return 100;
    const max = Math.max(...this.data().map((d) => d.value));
    return max > 0 ? Math.ceil(max * 1.15) : 100;
  });

  readonly minValue = computed(() => {
    if (!this.hasData()) return 0;
    const min = Math.min(...this.data().map((d) => d.value));
    return min < 0 ? min : 0;
  });

  readonly gridLines = computed(() => {
    const lines: { y: number; val: number }[] = [];
    const count = 4;
    const max = this.maxValue();
    const min = this.minValue();
    const range = max - min;
    const ph = this.plotHeight();

    for (let i = 0; i <= count; i++) {
      const val = Math.round(min + (range / count) * i);
      const y = this.padTop + ph - (ph / count) * i;
      lines.push({ y, val });
    }
    return lines;
  });

  readonly points = computed(() => {
    const list = this.data();
    if (!list || list.length < 2) return [];
    const pw = this.plotWidth();
    const ph = this.plotHeight();
    const min = this.minValue();
    const range = this.maxValue() - min || 1;

    return list.map((item, i) => {
      const x = this.padLeft + (i / (list.length - 1)) * pw;
      const y = this.padTop + ph - ((item.value - min) / range) * ph;
      return { x, y, item, index: i };
    });
  });

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return '';
    const lp = this.linePath();
    const bottomY = this.padTop + this.plotHeight();
    const firstX = pts[0].x.toFixed(1);
    const lastX = pts[pts.length - 1].x.toFixed(1);
    return `${lp} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  });

  readonly hoveredPoint = computed(() => {
    const idx = this.hoveredIndex();
    if (idx === null) return null;
    return this.points()[idx] || null;
  });

  onPointHover(index: number | null): void {
    this.hoveredIndex.set(index);
  }
}
