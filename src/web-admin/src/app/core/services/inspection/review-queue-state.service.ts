import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { InspectionReportsService } from './inspection-reports.service';
import { InspectionSummary } from '../../models/inspection/inspection.view-model';

@Injectable({
  providedIn: 'root',
})
export class ReviewQueueStateService {
  private readonly inspectionReportsService = inject(InspectionReportsService);

  private readonly _pendingCount = signal<number>(0);
  readonly pendingCount = this._pendingCount.asReadonly();

  /**
   * Refreshes the pending review count by calling getSummary().
   */
  refresh(): Observable<InspectionSummary> {
    return this.inspectionReportsService.getSummary().pipe(
      tap((summary) => {
        this._pendingCount.set(summary.pendingReviewCount ?? 0);
      })
    );
  }

  /**
   * Sets the pending review count directly.
   */
  setPendingCount(count: number): void {
    this._pendingCount.set(Math.max(0, count));
  }
}
