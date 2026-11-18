import { inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { InspectionReportsService } from './inspection-reports.service';
import { InspectionSummary } from '@models/inspection/inspection.view-model';

@Injectable({
  providedIn: 'root',
})
export class ReviewQueueStateService {
  private readonly inspectionReportsService = inject(InspectionReportsService);

  private readonly _pendingCount = signal<number>(0);
  readonly pendingCount = this._pendingCount.asReadonly();

  private readonly _summary = signal<InspectionSummary | null>(null);
  readonly summary = this._summary.asReadonly();

  /**
   * Refreshes the pending review count by calling getSummary().
   */
  refresh(): Observable<InspectionSummary> {
    return this.inspectionReportsService.getSummary().pipe(
      tap((summary) => {
        this._pendingCount.set(summary.pendingReviewCount ?? 0);
        this._summary.set(summary);
      })
    );
  }

  /**
   * Sets the pending review count directly.
   */
  setPendingCount(count: number): void {
    this._pendingCount.set(Math.max(0, count));
  }

  /**
   * Sets the inspection summary directly.
   */
  setSummary(summary: InspectionSummary): void {
    this._summary.set(summary);
    this._pendingCount.set(summary.pendingReviewCount ?? 0);
  }
}
