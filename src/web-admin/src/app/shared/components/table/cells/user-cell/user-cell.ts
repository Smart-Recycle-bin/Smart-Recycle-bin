import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Avatar } from '@shared/components/avatar/avatar';

@Component({
  selector: 'app-user-cell',
  imports: [Avatar],
  templateUrl: './user-cell.html',
  styleUrl: './user-cell.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCell {
  readonly name = input.required<string>();
  readonly subtitle = input<string>('');
  readonly avatarUrl = input<string | null | undefined>();
}
