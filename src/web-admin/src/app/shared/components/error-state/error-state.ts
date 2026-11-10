import { Component, input, output, signal } from '@angular/core';
import { Icon } from '../icon/icon';
import { Button } from '../button/button';

@Component({
  selector: 'app-error-state',
  imports: [Icon, Button],
  templateUrl: './error-state.html',
  styleUrl: './error-state.css',
})
export class ErrorState {
  readonly title = input<string>('Something went wrong');
  readonly description = input<string>('An error occurred while loading this data. Please try again.');
  readonly technicalDetails = input<string>('');
  readonly retryText = input<string>('Try Again');
  readonly showRetry = input<boolean>(true);

  readonly retryClicked = output<void>();

  readonly showDetails = signal<boolean>(false);

  handleRetry(): void {
    this.retryClicked.emit();
  }

  toggleDetails(): void {
    this.showDetails.update((v) => !v);
  }
}
