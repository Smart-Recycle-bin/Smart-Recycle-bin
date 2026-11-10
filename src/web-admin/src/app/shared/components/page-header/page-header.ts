import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Badge, BadgeVariant } from '../badge/badge';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-page-header',
  imports: [RouterLink, Badge, Icon],
  templateUrl: './page-header.html',
  styleUrl: './page-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly backLabel = input<string>('');
  readonly backRoute = input<string | null>(null);
  readonly statusLabel = input<string>('');
  readonly statusVariant = input<BadgeVariant>('neutral');
  readonly statusDot = input<boolean>(true);

  readonly backClicked = output<void>();
}
