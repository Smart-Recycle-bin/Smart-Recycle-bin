export const AnalyticsPeriod = {
  Today: 'today',
  SevenDays: '7d',
  ThirtyDays: '30d',
  Custom: 'custom',
} as const;

export type AnalyticsPeriod = (typeof AnalyticsPeriod)[keyof typeof AnalyticsPeriod];

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  [AnalyticsPeriod.Today]: 'Today',
  [AnalyticsPeriod.SevenDays]: '7d',
  [AnalyticsPeriod.ThirtyDays]: '30d',
  [AnalyticsPeriod.Custom]: 'Custom',
};
