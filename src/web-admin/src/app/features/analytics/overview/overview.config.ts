import { AnalyticsPeriod } from '../../../core/models/analytics/analytics-period.enum';
import { SegmentedOption } from '../../../shared/components/segmented-control/segmented-control';
import { BarListThresholds } from '../../../shared/components/charts/bar-list/bar-list';

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
  Plastic: 'var(--brand, #059669)',
  'Plastic (PET)': 'var(--brand, #059669)',
  Paper: 'var(--info, #2563eb)',
  Glass: 'var(--warning, #f59e0b)',
  Metal: 'var(--purple, #7c3aed)',
  Other: 'var(--muted, #64748b)',
  'Mixed packaging': 'var(--danger, #ef4444)',
};

export function getMaterialColor(material: string, index: number): string {
  if (MATERIAL_COLORS[material]) {
    return MATERIAL_COLORS[material];
  }
  const fallbackPalette = [
    'var(--brand, #059669)',
    'var(--info, #2563eb)',
    'var(--warning, #f59e0b)',
    'var(--purple, #7c3aed)',
    'var(--danger, #ef4444)',
    'var(--muted, #64748b)',
  ];
  return fallbackPalette[index % fallbackPalette.length];
}
