import { TableColumn } from '@shared/components/table/data-table/data-table';
import { RecentSurveyRow } from '@models/survey/survey.view-model';
import { SurveyOutcome } from '@models/survey/survey-outcome.enum';
import { BadgeVariant } from '@shared/components/badge/badge';
import { StatTrend } from '@shared/components/stat/stat';
import { BarListThresholds } from '@shared/components/charts/bar-list/bar-list';

export const RECENT_SURVEY_COLUMNS: TableColumn<RecentSurveyRow>[] = [
  {
    key: 'sessionId',
    label: 'Session ID',
    sortable: true,
    width: '140px',
    nowrap: true,
  },
  {
    key: 'userName',
    label: 'User',
    sortable: true,
  },
  {
    key: 'itemsSummary',
    label: 'Items',
    sortable: false,
  },
  {
    key: 'points',
    label: 'Points',
    align: 'right',
    sortable: true,
    width: '120px',
  },
  {
    key: 'result',
    label: 'Result',
    align: 'center',
    sortable: true,
    width: '130px',
  },
];

export const SURVEY_BADGE_VARIANTS: Record<SurveyOutcome, BadgeVariant> = {
  [SurveyOutcome.Confirmed]: 'success',
  [SurveyOutcome.Rejected]: 'danger',
};

export const BIN_REJECTION_THRESHOLDS: BarListThresholds = {
  warning: 8,
  danger: 12,
};

export const CATEGORY_COLORS: Record<string, string> = {
  'Mixed packaging': 'var(--chart-5)',
  'Plastic (HDPE)': 'var(--chart-4)',
  'Plastic (PET)': 'var(--chart-1)',
  Paper: 'var(--chart-2)',
  Glass: 'var(--chart-3)',
  Metal: 'var(--chart-6)',
};

export function getCategoryColor(category: string, index: number): string {
  if (CATEGORY_COLORS[category]) {
    return CATEGORY_COLORS[category];
  }
  const fallback = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-4)',
    'var(--chart-3)',
    'var(--chart-5)',
    'var(--chart-6)',
  ];
  return fallback[index % fallback.length];
}

export function formatSignedPp(delta: number): string {
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta} pp`;
}

export function getConfirmRateTrend(delta: number): StatTrend {
  if (delta > 0) return 'positive';
  if (delta < 0) return 'negative';
  return 'neutral';
}

/**
 * For reject rate, a falling reject rate is a POSITIVE trend.
 */
export function getRejectRateTrend(delta: number): StatTrend {
  if (delta < 0) return 'positive';
  if (delta > 0) return 'negative';
  return 'neutral';
}

import { environment } from '@env/environment';

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    timeZone: environment.displayTimeZone,
    month: 'short',
    day: 'numeric',
  });
}
