import { Component, computed, inject, input } from '@angular/core';
import { ThemeService } from '@services/theme/theme.service';

@Component({
  selector: 'app-gauge',
  imports: [],
  templateUrl: './gauge.html',
  styleUrl: './gauge.css',
})
export class Gauge {
  private readonly themeService = inject(ThemeService, { optional: true });

  readonly value = input<number>(0);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly label = input<string>('Capacity');
  readonly unit = input<string>('%');
  readonly color = input<string>('');
  readonly autoColor = input<boolean>(true);

  readonly arcLength = Math.PI * 45; // ~141.37

  readonly clampedValue = computed(() => {
    return Math.max(this.min(), Math.min(this.value(), this.max()));
  });

  readonly percentage = computed<number>(() => {
    const range = this.max() - this.min();
    if (range <= 0) return 0;
    return Math.round(((this.clampedValue() - this.min()) / range) * 100);
  });

  readonly strokeDashoffset = computed<number>(() => {
    const pct = this.percentage();
    return this.arcLength * (1 - pct / 100);
  });

  readonly statusColor = computed<string>(() => {
    // Read theme signal so changes reactively trigger updates
    this.themeService?.theme();

    if (this.color()) return this.color();
    if (!this.autoColor()) return 'var(--primary)';

    const pct = this.percentage();
    if (pct >= 85) return 'var(--danger-fg)';
    if (pct >= 65) return 'var(--warning-fg)';
    return 'var(--primary)';
  });

  readonly statusLabel = computed<string>(() => {
    const pct = this.percentage();
    if (pct >= 85) return 'Critical / Full';
    if (pct >= 65) return 'Medium';
    return 'Optimal';
  });
}
