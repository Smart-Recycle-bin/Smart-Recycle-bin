import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Skeleton, SkeletonVariant } from '../skeleton/skeleton';
import { ErrorState } from '../error-state/error-state';
import { EmptyState } from '../empty-state/empty-state';
import { getErrorMessage } from '@core/errors/error-message';

@Component({
  selector: 'app-resource-state',
  imports: [Skeleton, ErrorState, EmptyState],
  templateUrl: './resource-state.html',
  styleUrl: './resource-state.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceState {
  readonly loading = input<boolean>(false);
  readonly error = input<unknown>(null);
  readonly empty = input<boolean>(false);
  readonly emptyTitle = input<string>('No items found');
  readonly emptyDescription = input<string>('There is no data to display right now.');
  readonly emptyIcon = input<string>('recycle');

  readonly skeletonCount = input<number>(3);
  readonly skeletonHeight = input<string | number>('40px');
  readonly skeletonVariant = input<SkeletonVariant>('rectangular');

  readonly retry = output<void>();

  readonly hasError = computed<boolean>(() => {
    const err = this.error();
    return err !== null && err !== undefined && err !== false;
  });

  readonly technicalDetails = computed<string>(() => {
    const err = this.error();
    return err ? getErrorMessage(err) : '';
  });

  handleRetry(): void {
    this.retry.emit();
  }
}
