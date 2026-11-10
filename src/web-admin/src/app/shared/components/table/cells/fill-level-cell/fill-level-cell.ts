import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-fill-level-cell',
  imports: [],
  templateUrl: './fill-level-cell.html',
  styleUrl: './fill-level-cell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FillLevelCell {
  readonly value = input.required<number>();
  readonly warningThreshold = input<number>(80);
  readonly dangerThreshold = input<number>(95);

  readonly clamped = computed(() => Math.max(0, Math.min(100, Math.round(this.value()))));

  readonly tone = computed<'ok' | 'warning' | 'danger'>(() => {
    const val = this.clamped();
    if (val >= this.dangerThreshold()) return 'danger';
    if (val >= this.warningThreshold()) return 'warning';
    return 'ok';
  });
}
