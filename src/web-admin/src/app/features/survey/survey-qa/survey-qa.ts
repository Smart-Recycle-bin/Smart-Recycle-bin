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
import { of, Subject } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
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
import { Button } from '@shared/components/button/button';
import {
  DateRangeInput,
  DateRangeValue,
} from '@shared/components/form/date-range-input/date-range-input';
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
    Button,
    DateRangeInput,
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
  readonly dateRange = signal<DateRangeValue>({ from: null, to: null });

  private readonly summaryTrigger$ = new Subject<void>();

  readonly hasDateFilter = computed(() => {
    const r = this.dateRange();
    return Boolean(r.from || r.to);
  });

  readonly activeDateQuery = computed<SurveyQaQuery | undefined>(() => {
    const r = this.dateRange();
    const from = r.from || undefined;
    const to = r.to || undefined;
    if (!from && !to) return undefined;
    return { from, to };
  });

  readonly surveysCardTitle = computed(() => {
    return this.hasDateFilter() ? 'Surveys (filtered)' : 'Total surveys';
  });

  readonly splitSubtitle = computed(() => {
    return this.hasDateFilter()
      ? 'Outcome split within selected date range'
      : 'Outcome split across post-disposal surveys';
  });

  readonly pagedList = createPagedList<RecentSurveyRow, SurveyQaQuery>({
    fetch: (query) => this.surveyQaService.getRecentSurveys(query),
    initial: { pageSize: 6 },
  });

  readonly kpis = computed(() => this.summary()?.kpis ?? null);

  readonly confirmTrend = computed(() => {
    const k = this.kpis();
    if (!k || k.confirmRateDeltaPp === null || k.confirmRateDeltaPp === undefined) {
      return null;
    }
    return getConfirmRateTrend(k.confirmRateDeltaPp);
  });

  readonly rejectTrend = computed(() => {
    const k = this.kpis();
    if (!k || k.rejectRateDeltaPp === null || k.rejectRateDeltaPp === undefined) {
      return null;
    }
    return getRejectRateTrend(k.rejectRateDeltaPp);
  });

  readonly confirmDeltaText = computed(() => {
    const k = this.kpis();
    if (!k || k.confirmRateDeltaPp === null || k.confirmRateDeltaPp === undefined) {
      return '';
    }
    return formatSignedPp(k.confirmRateDeltaPp);
  });

  readonly rejectDeltaText = computed(() => {
    const k = this.kpis();
    if (!k || k.rejectRateDeltaPp === null || k.rejectRateDeltaPp === undefined) {
      return '';
    }
    return formatSignedPp(k.rejectRateDeltaPp);
  });

  readonly averageAiRatingDisplay = computed(() => {
    const rating = this.kpis()?.averageAiRating;
    return rating !== null && rating !== undefined ? rating.toFixed(1) : 'Not Tracked';
  });

  readonly averageAiRatingUnit = computed(() => {
    const rating = this.kpis()?.averageAiRating;
    return rating !== null && rating !== undefined ? '/ 5' : '';
  });

  readonly averageAiRatingDescription = computed(() => {
    const rating = this.kpis()?.averageAiRating;
    return rating !== null && rating !== undefined
      ? ''
      : 'Not captured on confirmed surveys';
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
      label: item.binName ? `${item.binName} (#${item.binId})` : `Bin #${item.binId}`,
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
    this.summaryTrigger$
      .pipe(
        tap(() => {
          this.isLoading.set(true);
          this.error.set(null);
        }),
        switchMap(() =>
          this.surveyQaService.getQaSummary(this.activeDateQuery()).pipe(
            map((summary) => ({ ok: true as const, summary })),
            catchError((err) => of({ ok: false as const, error: err }))
          )
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((result) => {
        this.isLoading.set(false);
        if (result.ok) {
          this.summary.set(result.summary);
        } else {
          this.error.set(result.error);
        }
      });

    this.loadData();
  }

  loadData(): void {
    this.summaryTrigger$.next();
  }

  handleDateRangeChange(range: DateRangeValue): void {
    this.dateRange.set(range);
    if (range.from && range.to && range.from > range.to) {
      return;
    }
    this.loadData();
    this.pagedList.patchFilters({
      from: range.from || undefined,
      to: range.to || undefined,
    });
  }

  clearDateFilter(): void {
    this.handleDateRangeChange({ from: null, to: null });
  }

  reload(): void {
    this.loadData();
    this.pagedList.reload();
  }

  readonly getRowId = (row: RecentSurveyRow): string => String(row.sessionId);

  getResultBadgeVariant(outcome: SurveyOutcome): BadgeVariant {
    return SURVEY_BADGE_VARIANTS[outcome] ?? 'neutral';
  }

  getOutcomeLabel(outcome: SurveyOutcome | string): string {
    return this.outcomeLabels[outcome as SurveyOutcome] ?? outcome;
  }
}
