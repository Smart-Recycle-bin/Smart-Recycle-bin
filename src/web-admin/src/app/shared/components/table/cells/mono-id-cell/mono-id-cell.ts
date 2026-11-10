import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-mono-id-cell',
  imports: [],
  templateUrl: './mono-id-cell.html',
  styleUrl: './mono-id-cell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonoIdCell {
  readonly value = input.required<string | number>();
}
