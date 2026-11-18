import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '@services/analytics/analytics.service';
import {
  AnalyticsPeriod,
} from '@models/analytics/analytics-period.enum';
import {
  DashboardOverview,
  OverviewQuery,
} from '@models/analytics/analytics.view-model';
import {
  HOTSPOT_THRESHOLDS,
  PERIOD_OPTIONS,
  getMaterialColor,
} from './overview.config';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Button } from '@shared/components/button/button';
import { Stat, StatTrend } from '@shared/components/stat/stat';
import { SegmentedControl } from '@shared/components/segmented-control/segmented-control';
import {
  DateRangeInput,
  DateRangeValue,
} from '@shared/components/form/date-range-input/date-range-input';
import {
  AreaChart,
  AreaChartPoint,
  AreaChartSeries,
} from '@shared/components/charts/area-chart/area-chart';
import {
  DonutChart,
  DonutSegment,
} from '@shared/components/charts/donut-chart/donut-chart';
import {
  BarList,
  BarListItem,
} from '@shared/components/charts/bar-list/bar-list';
import { Progress } from '@shared/components/progress/progress';
import { Badge } from '@shared/components/badge/badge';
import { Card } from '@shared/components/card/card';
import { Icon } from '@shared/components/icon/icon';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { TooltipDirective } from '@shared/components/tooltip/tooltip.directive';

import { environment } from '@env/environment';

function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    timeZone: environment.displayTimeZone,
    month: 'short',
    day: 'numeric',
  });
}

@Component({
  selector: 'app-overview',
  imports: [
    DecimalPipe,
    RouterLink,
    PageHeader,
    Button,
    Stat,
    SegmentedControl,
    DateRangeInput,
    AreaChart,
    DonutChart,
    BarList,
    Progress,
    Badge,
    Card,
    Icon,
    Skeleton,
    ResourceState,
    TooltipDirective,
  ],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Overview implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);

  readonly periodOptions = PERIOD_OPTIONS;
  readonly hotspotThresholds = HOTSPOT_THRESHOLDS;
  readonly AnalyticsPeriod = AnalyticsPeriod;

  readonly selectedPeriod = signal<AnalyticsPeriod>(AnalyticsPeriod.SevenDays);
  readonly customRange = signal<DateRangeValue>({ from: null, to: null });

  readonly overviewData = signal<DashboardOverview | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  readonly isCustomPeriod = computed(() => this.selectedPeriod() === AnalyticsPeriod.Custom);

  /**
   * Computed Series for Points Issued vs Redeemed Area Chart
   */
  readonly pointsComparisonSeries = computed<AreaChartSeries[]>(() => {
    const data = this.overviewData()?.pointsComparisonSeries ?? [];
    return [
      {
        name: 'Issued',
        color: 'var(--chart-1)',
        points: data.map((p) => ({ label: formatShortDate(p.date), value: p.issued })),
      },
      {
        name: 'Redeemed',
        color: 'var(--chart-3)',
        points: data.map((p) => ({ label: formatShortDate(p.date), value: p.redeemed })),
      },
    ];
  });

  /**
   * Computed Segments for Material Recovery Donut Chart
   */
  readonly materialDonutSegments = computed<DonutSegment[]>(() => {
    const list = this.overviewData()?.materialShares ?? [];
    return list.map((m, idx) => ({
      label: m.material,
      value: m.percentage,
      color: getMaterialColor(m.material, idx),
    }));
  });

  /**
   * Computed Points for Contamination Rate Sparkline
   */
  readonly contaminationTrendPoints = computed<AreaChartPoint[]>(() => {
    const list = this.overviewData()?.contaminationTrend ?? [];
    return list.map((p) => ({
      label: formatShortDate(p.date),
      value: p.value,
    }));
  });

  /**
   * Computed Points for Daily Active Users Sparkline
   */
  readonly dauTrendPoints = computed<AreaChartPoint[]>(() => {
    const list = this.overviewData()?.dauTrend ?? [];
    return list.map((p) => ({
      label: formatShortDate(p.date),
      value: p.value,
    }));
  });

  /**
   * Computed Items for Top Contamination Hotspots Bar List
   */
  readonly hotspotItems = computed<BarListItem[]>(() => {
    const list = this.overviewData()?.topContaminationHotspots ?? [];
    return list.map((item) => ({
      label: item.category,
      value: item.rejectionRate,
      formattedValue: `${item.rejectionRate}%`,
    }));
  });

  /**
   * Fleet Health Percentages and Breakdown
   */
  readonly fleetPercentages = computed(() => {
    const fleet = this.overviewData()?.fleetHealth;
    if (!fleet || fleet.totalBins <= 0) {
      return {
        availablePct: 0,
        eightyPct: 0,
        needsServicingPct: 0,
        offlinePct: 0,
      };
    }
    const total = fleet.totalBins;
    return {
      availablePct: Math.round((fleet.available / total) * 100),
      eightyPct: Math.round((fleet.eightyPercentFull / total) * 100),
      needsServicingPct: Math.round((fleet.needsServicing / total) * 100),
      offlinePct: Math.round((fleet.offline / total) * 100),
    };
  });

  ngOnInit(): void {
    this.loadOverview();
  }

  handlePeriodChange(val: string | number): void {
    const period = val as AnalyticsPeriod;
    this.selectedPeriod.set(period);
    this.loadOverview();
  }

  handleCustomRangeChange(range: DateRangeValue): void {
    this.customRange.set(range);
    if (range.from && range.to && range.from > range.to) {
      return;
    }
    this.loadOverview();
  }

  loadOverview(): void {
    const period = this.selectedPeriod();
    const query: OverviewQuery = { period };

    if (period === AnalyticsPeriod.Custom) {
      const range = this.customRange();
      if (range.from) query.from = range.from;
      if (range.to) query.to = range.to;
    }

    this.isLoading.set(true);
    this.error.set(null);

    this.analyticsService.getOverview(query).subscribe({
      next: (data) => {
        this.overviewData.set(data);
        this.isLoading.set(false);
      },
      error: (err: unknown) => {
        this.error.set(err);
        this.isLoading.set(false);
      },
    });
  }

  resolveTrend(positive: boolean | undefined): StatTrend | null {
    if (positive === undefined) return null;
    return positive ? 'positive' : 'negative';
  }
}
