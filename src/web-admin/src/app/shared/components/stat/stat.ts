import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';
import { Badge } from '../badge/badge';

export type StatTrend = 'positive' | 'negative' | 'neutral';
export type StatIconTone = 'green' | 'blue' | 'purple' | 'amber' | 'red';

@Component({
  selector: 'app-stat',
  imports: [Icon, Badge],
  templateUrl: './stat.html',
  styleUrl: './stat.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stat {
  readonly title = input.required<string>();
  readonly value = input.required<string | number>();
  readonly unit = input<string>('');
  readonly change = input<string>('');
  readonly trend = input<StatTrend | null>(null);
  readonly icon = input<IconName | string | null | undefined>();
  readonly iconTone = input<StatIconTone>('green');
  readonly description = input<string>('');
  readonly comparisonLabel = input<string>('vs prev. period');

  readonly trendIcon = computed<IconName>(() => {
    switch (this.trend()) {
      case 'positive':
        return 'trending-up';
      case 'negative':
        return 'trending-down';
      default:
        return 'activity';
    }
  });

  readonly badgeVariant = computed<'success' | 'danger' | 'neutral'>(() => {
    switch (this.trend()) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'danger';
      default:
        return 'neutral';
    }
  });
}
