import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-route-placeholder',
  imports: [],
  templateUrl: './route-placeholder.html',
  styleUrl: './route-placeholder.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoutePlaceholder {
  private readonly route = inject(ActivatedRoute);

  readonly title = toSignal(
    this.route.data.pipe(map((d) => (d['title'] as string) || 'Page')),
    { initialValue: (this.route.snapshot.data['title'] as string) || 'Page' }
  );

  readonly description = toSignal(
    this.route.data.pipe(
      map((d) => (d['description'] as string) || 'Feature route placeholder — ready for implementation.')
    ),
    {
      initialValue:
        (this.route.snapshot.data['description'] as string) ||
        'Feature route placeholder — ready for implementation.',
    }
  );
}
