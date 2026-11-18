import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { ThemeService } from '@services/theme/theme.service';

export interface AreaChartPoint {
  label: string;
  value: number;
}

export interface AreaChartSeries {
  name: string;
  color?: string;
  points: AreaChartPoint[];
}

interface ComputedSeriesPoint {
  x: number;
  y: number;
  value: number;
  label: string;
  index: number;
}

interface ComputedSeries {
  name: string;
  color: string;
  gradientId: string;
  points: ComputedSeriesPoint[];
  linePath: string;
  areaPath: string;
}

const DEFAULT_PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)'];

@Component({
  selector: 'app-area-chart',
  imports: [],
  templateUrl: './area-chart.html',
  styleUrl: './area-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AreaChart {
  private readonly themeService = inject(ThemeService, { optional: true });

  readonly data = input<AreaChartPoint[]>([]);
  readonly series = input<AreaChartSeries[]>([]);
  readonly seriesLabel = input<string>('');
  readonly title = input<string>('');
  readonly height = input<number>(220);
  readonly color = input<string>('var(--chart-1)');
  readonly unit = input<string>('');
  readonly showGrid = input<boolean>(true);
  readonly showLegend = input<boolean>(true);
  readonly compactAxis = input<boolean>(true);
  readonly smooth = input<boolean>(true);

  readonly hoveredIndex = signal<number | null>(null);

  readonly width = 560;
  readonly padLeft = 44;
  readonly padRight = 16;
  readonly padTop = 16;
  readonly padBottom = 28;

  private readonly chartId = `area-grad-${Math.random().toString(36).slice(2, 9)}`;

  readonly rawSeries = computed<AreaChartSeries[]>(() => {
    // Read theme so theme change triggers chart recalculation
    this.themeService?.currentTheme();

    const multi = this.series();
    if (multi && multi.length > 0) {
      return multi;
    }
    const single = this.data();
    if (single && single.length > 0) {
      return [
        {
          name: this.seriesLabel() || this.title() || 'Total',
          color: this.color(),
          points: single,
        },
      ];
    }
    return [];
  });

  readonly shouldShowLegend = computed(() => {
    if (!this.showLegend()) return false;
    return this.series().length > 0 || (this.data().length > 0 && !!this.seriesLabel());
  });

  readonly pointCount = computed(() => {
    const list = this.rawSeries();
    if (list.length === 0) return 0;
    return Math.max(...list.map((s) => s.points.length));
  });

  readonly hasData = computed(() => this.pointCount() > 1);

  readonly plotWidth = computed(() => this.width - this.padLeft - this.padRight);
  readonly plotHeight = computed(() => this.height() - this.padTop - this.padBottom);

  readonly maxValue = computed(() => {
    if (!this.hasData()) return 100;
    const allValues = this.rawSeries().flatMap((s) => s.points.map((p) => p.value));
    const max = Math.max(...allValues, 0);
    return max > 0 ? Math.ceil(max * 1.12) : 100;
  });

  readonly minValue = computed(() => {
    if (!this.hasData()) return 0;
    const allValues = this.rawSeries().flatMap((s) => s.points.map((p) => p.value));
    const min = Math.min(...allValues, 0);
    return min < 0 ? min : 0;
  });

  readonly gridLines = computed(() => {
    const lines: { y: number; val: number; formatted: string }[] = [];
    const count = 4;
    const max = this.maxValue();
    const min = this.minValue();
    const range = max - min;
    const ph = this.plotHeight();

    for (let i = 0; i <= count; i++) {
      const val = Math.round(min + (range / count) * i);
      const y = this.padTop + ph - (ph / count) * i;
      lines.push({ y, val, formatted: this.formatAxisValue(val) });
    }
    return lines;
  });

  readonly xLabels = computed(() => {
    const primary = this.rawSeries()[0]?.points ?? [];
    if (primary.length < 2) return [];
    const pw = this.plotWidth();
    const lastIdx = primary.length - 1;
    return primary.map((p, index) => ({
      index,
      label: p.label,
      x: this.padLeft + (index / lastIdx) * pw,
      showLabel:
        primary.length <= 7 ||
        index === 0 ||
        index === lastIdx ||
        index === Math.floor(lastIdx / 2),
      anchor: index === 0 ? 'start' : index === lastIdx ? 'end' : 'middle',
    }));
  });

  readonly computedSeries = computed<ComputedSeries[]>(() => {
    const list = this.rawSeries();
    if (!this.hasData()) return [];

    const pw = this.plotWidth();
    const ph = this.plotHeight();
    const min = this.minValue();
    const range = this.maxValue() - min || 1;
    const bottomY = this.padTop + ph;

    return list.map((s, seriesIdx) => {
      const pts = s.points;
      const denom = Math.max(pts.length - 1, 1);
      const computedPts: ComputedSeriesPoint[] = pts.map((item, i) => ({
        x: this.padLeft + (i / denom) * pw,
        y: this.padTop + ph - ((item.value - min) / range) * ph,
        value: item.value,
        label: item.label,
        index: i,
      }));

      const linePath = this.buildPath(computedPts, this.smooth());
      const firstX = computedPts[0]?.x.toFixed(1) ?? this.padLeft.toFixed(1);
      const lastX = computedPts[computedPts.length - 1]?.x.toFixed(1) ?? this.padLeft.toFixed(1);
      const areaPath = linePath
        ? `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`
        : '';

      return {
        name: s.name,
        color: s.color || DEFAULT_PALETTE[seriesIdx % DEFAULT_PALETTE.length],
        gradientId: `${this.chartId}-${seriesIdx}`,
        points: computedPts,
        linePath,
        areaPath,
      };
    });
  });

  readonly hoverSlices = computed(() => {
    const labels = this.xLabels();
    if (labels.length === 0) return [];
    const pw = this.plotWidth();
    const step = labels.length > 1 ? pw / (labels.length - 1) : pw;
    return labels.map((l) => {
      const x = Math.max(this.padLeft, l.x - step / 2);
      const right = Math.min(this.width - this.padRight, l.x + step / 2);
      return {
        index: l.index,
        label: l.label,
        centerX: l.x,
        x,
        width: Math.max(right - x, 12),
      };
    });
  });

  readonly hoveredData = computed(() => {
    const idx = this.hoveredIndex();
    if (idx === null) return null;
    const labels = this.xLabels();
    const target = labels[idx];
    if (!target) return null;

    const entries = this.computedSeries()
      .map((s) => {
        const pt = s.points[idx];
        return pt
          ? {
              name: s.name,
              color: s.color,
              value: pt.value,
              x: pt.x,
              y: pt.y,
            }
          : null;
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    if (entries.length === 0) return null;

    const leftPercent = Math.min(82, Math.max(12, (target.x / this.width) * 100));
    return {
      index: idx,
      label: target.label,
      x: target.x,
      leftPercent,
      entries,
    };
  });

  onPointHover(index: number | null): void {
    this.hoveredIndex.set(index);
  }

  formatAxisValue(val: number): string {
    if (!this.compactAxis()) {
      return `${val}`;
    }
    const abs = Math.abs(val);
    if (abs >= 1_000_000) {
      const num = +(val / 1_000_000).toFixed(1);
      return `${num}m`;
    }
    if (abs >= 1000) {
      const num = +(val / 1000).toFixed(1);
      return `${num}k`;
    }
    return `${val}`;
  }

  private buildPath(pts: ComputedSeriesPoint[], smooth: boolean): string {
    if (pts.length < 2) return '';
    if (!smooth) {
      return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    }

    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const tension = 0.18;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return d;
  }
}
