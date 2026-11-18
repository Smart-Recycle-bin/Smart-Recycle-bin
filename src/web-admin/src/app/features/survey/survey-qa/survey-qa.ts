import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SurveyQaService } from '@services/survey/survey-qa.service';
import {
  RecentSurveyRow,
  SurveyQaQuery,
  SurveyQaSummary,
} from '@models/survey/survey.view-model';
import {
  SurveyOutcome,
  SURVEY_OUTCOME_LABELS,
} from '@models/survey/survey-outcome.enum';
import { PageHeader } from '@shared/components/page-header/page-header';
import { Stat } from '@shared/components/stat/stat';
import {
  DonutChart,
  DonutSegment,
} from '@shared/components/charts/donut-chart/donut-chart';
import {
  AreaChart,
  AreaChartPoint,
} from '@shared/components/charts/area-chart/area-chart';
import {
  BarList,
  BarListItem,
} from '@shared/components/charts/bar-list/bar-list';
import { Card } from '@shared/components/card/card';
import { Badge, BadgeVariant } from '@shared/components/badge/badge';
import { DataTable } from '@shared/components/table/data-table/data-table';
import { CellTemplateDirective } from '@shared/components/table/data-table/cell-template.directive';
import { MonoIdCell } from '@shared/components/table/cells/mono-id-cell/mono-id-cell';
import { ResourceState } from '@shared/components/resource-state/resource-state';
import { Skeleton } from '@shared/components/skeleton/skeleton';
import { createPagedList } from '@shared/utils/paged-list';
import {
  BIN_REJECTION_THRESHOLDS,
  formatShortDate,
  formatSignedPp,
  getCategoryColor,
  getConfirmRateTrend,
  getRejectRateTrend,
  RECENT_SURVEY_COLUMNS,
  SURVEY_BADGE_VARIANTS,
} from './survey-qa.config';

@Component({
  selector: 'app-survey-qa',
  imports: [
    DecimalPipe,
    PageHeader,
    Stat,
    DonutChart,
    AreaChart,
    BarList,
    Card,
    Badge,
    DataTable,
    CellTemplateDirective,
    MonoIdCell,
    ResourceState,
    Skeleton,
  ],
  templateUrl: './survey-qa.html',
  styleUrl: './survey-qa.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyQa implements OnInit {
  private readonly surveyQaService = inject(SurveyQaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly outcomeLabels = SURVEY_OUTCOME_LABELS;
  readonly SurveyOutcome = SurveyOutcome;
  readonly columns = RECENT_SURVEY_COLUMNS;
  readonly binThresholds = BIN_REJECTION_THRESHOLDS;

  readonly summary = signal<SurveyQaSummary | null>(null);
  readonly isLoading = signal<boolean>(true);
  readonly error = signal<unknown>(null);

  readonly pagedList = createPagedList<RecentSurveyRow, SurveyQaQuery>({
    fetch: (query) => this.surveyQaService.getRecentSurveys(query),
    initial: { pageSize: 6 },
  });

  readonly kpis = computed(() => this.summary()?.kpis ?? null);

  readonly confirmTrend = computed(() => {
    const k = this.kpis();
    return k ? getConfirmRateTrend(k.confirmRateDeltaPp) : null;
  });

  readonly rejectTrend = computed(() => {
    const k = this.kpis();
    return k ? getRejectRateTrend(k.rejectRateDeltaPp) : null;
  });

  readonly confirmDeltaText = computed(() => {
    const k = this.kpis();
    return k ? formatSignedPp(k.confirmRateDeltaPp) : '';
  });

  readonly rejectDeltaText = computed(() => {
    const k = this.kpis();
    return k ? formatSignedPp(k.rejectRateDeltaPp) : '';
  });

  readonly donutData = computed<DonutSegment[]>(() => {
    const s = this.summary();
    if (!s) return [];
    return [
      {
        label: 'Confirmed',
        value: s.confirmCount,
        color: 'var(--chart-1)',
      },
      {
        label: 'Rejected',
        value: s.rejectCount,
        color: 'var(--chart-5)',
      },
    ];
  });

  readonly donutCenterValue = computed<string | null>(() => {
    const k = this.kpis();
    return k ? `${k.rejectRate}%` : null;
  });

  readonly trendPoints = computed<AreaChartPoint[]>(() => {
    const list = this.summary()?.rejectionTrend ?? [];
    return list.map((item) => ({
      label: formatShortDate(item.date),
      value: item.rejectionRate,
    }));
  });

  readonly highestRejectionBins = computed<BarListItem[]>(() => {
    const list = this.summary()?.highestRejectionBins ?? [];
    return list.slice(0, 6).map((item) => ({
      label: item.binId,
      value: item.rejectionRate,
      formattedValue: `${item.rejectionRate}%`,
    }));
  });

  readonly rejectionByCategory = computed<BarListItem[]>(() => {
    const list = this.summary()?.rejectionByCategory ?? [];
    return list.map((item, index) => ({
      label: item.category,
      value: item.rejectionRate,
      formattedValue: `${item.rejectionRate}%`,
      color: getCategoryColor(item.category, index),
    }));
  });

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.surveyQaService
      .getQaSummary()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (summary) => {
          this.summary.set(summary);
          this.isLoading.set(false);
        },
        error: (err) => {
          this.error.set(err);
          this.isLoading.set(false);
        },
      });
  }

  reload(): void {
    this.loadData();
    this.pagedList.reload();
  }

  readonly getRowId = (row: RecentSurveyRow): string => row.sessionId;

  getResultBadgeVariant(outcome: SurveyOutcome): BadgeVariant {
    return SURVEY_BADGE_VARIANTS[outcome] ?? 'neutral';
  }

  getOutcomeLabel(outcome: SurveyOutcome | string): string {
    return this.outcomeLabels[outcome as SurveyOutcome] ?? outcome;
  }
}
