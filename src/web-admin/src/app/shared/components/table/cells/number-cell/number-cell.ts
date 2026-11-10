import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type NumberCellTone = 'default' | 'positive' | 'negative' | 'muted';

@Component({
  selector: 'app-number-cell',
  imports: [],
  templateUrl: './number-cell.html',
  styleUrl: './number-cell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NumberCell {
  readonly value = input.required<string | number>();
  readonly tone = input<NumberCellTone>('default');
}
