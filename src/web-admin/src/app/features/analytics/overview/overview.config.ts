import { AnalyticsPeriod } from '@models/analytics/analytics-period.enum';
import { SegmentedOption } from '@shared/components/segmented-control/segmented-control';
import { BarListThresholds } from '@shared/components/charts/bar-list/bar-list';

export const PERIOD_OPTIONS: SegmentedOption<AnalyticsPeriod>[] = [
  { label: 'Today', value: AnalyticsPeriod.Today },
  { label: '7d', value: AnalyticsPeriod.SevenDays },
  { label: '30d', value: AnalyticsPeriod.ThirtyDays },
  { label: 'Custom', value: AnalyticsPeriod.Custom },
];

export const HOTSPOT_THRESHOLDS: BarListThresholds = {
  warning: 10,
  danger: 18,
};

export const MATERIAL_COLORS: Record<string, string> = {
  Plastic: 'var(--chart-1)',
  'Plastic (PET)': 'var(--chart-1)',
  Paper: 'var(--chart-2)',
  Glass: 'var(--chart-4)',
  Metal: 'var(--chart-3)',
  Other: 'var(--chart-6)',
  'Mixed packaging': 'var(--chart-5)',
};

export function getMaterialColor(material: string, index: number): string {
  if (MATERIAL_COLORS[material]) {
    return MATERIAL_COLORS[material];
  }
  const fallbackPalette = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-4)',
    'var(--chart-3)',
    'var(--chart-5)',
    'var(--chart-6)',
  ];
  return fallbackPalette[index % fallbackPalette.length];
}
