import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewQueueStateService } from './review-queue-state.service';
import { InspectionReportsService } from './inspection-reports.service';
import { InspectionSummary } from '@models/inspection/inspection.view-model';

describe('ReviewQueueStateService', () => {
  let service: ReviewQueueStateService;
  let inspectionReportsSpy: {
    getSummary: ReturnType<typeof vi.fn>;
  };

  const mockSummary: InspectionSummary = {
    labelledImagesCount: 120,
    targetImagesThreshold: 500,
    remainingUntilRetrain: 380,
    pendingReviewCount: 7,
    reviewedCount: 45,
  };

  beforeEach(() => {
    inspectionReportsSpy = {
      getSummary: vi.fn().mockReturnValue(of(mockSummary)),
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewQueueStateService,
        { provide: InspectionReportsService, useValue: inspectionReportsSpy },
      ],
    });

    service = TestBed.inject(ReviewQueueStateService);
  });

  it('should initialize with pendingCount 0', () => {
    expect(service.pendingCount()).toBe(0);
  });

  it('should update pendingCount when refresh() is invoked', () => {
    let result: InspectionSummary | undefined;
    service.refresh().subscribe((summary) => {
      result = summary;
    });

    expect(inspectionReportsSpy.getSummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSummary);
    expect(service.pendingCount()).toBe(7);
  });

  it('should update pendingCount using setPendingCount', () => {
    service.setPendingCount(12);
    expect(service.pendingCount()).toBe(12);

    service.setPendingCount(-5);
    expect(service.pendingCount()).toBe(0);
  });
});
