import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewQueue } from './review-queue';
import { InspectionReportsService } from '../../../core/services/inspection/inspection-reports.service';
import { ReviewQueueStateService } from '../../../core/services/inspection/review-queue-state.service';
import { InspectionReportStatus } from '../../../core/models/inspection/inspection-report-status.enum';
import { MOCK_INSPECTION_REPORTS, MOCK_INSPECTION_SUMMARY } from '../../../core/mock/data/inspection/inspection.mock';
import {
  getInspectionReportStatusBadgeVariant,
  getInspectionReportStatusLabel,
} from './review-queue.config';

describe('ReviewQueue Component', () => {
  let component: ReviewQueue;
  let fixture: ComponentFixture<ReviewQueue>;
  let router: Router;
  let inspectionReportsServiceSpy: {
    getSummary: ReturnType<typeof vi.fn>;
    getReports: ReturnType<typeof vi.fn>;
  };
  let reviewQueueStateSpy: {
    setPendingCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    inspectionReportsServiceSpy = {
      getSummary: vi.fn().mockReturnValue(of(MOCK_INSPECTION_SUMMARY)),
      getReports: vi.fn().mockReturnValue(of(MOCK_INSPECTION_REPORTS)),
    };

    reviewQueueStateSpy = {
      setPendingCount: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReviewQueue],
      providers: [
        provideRouter([]),
        { provide: InspectionReportsService, useValue: inspectionReportsServiceSpy },
        { provide: ReviewQueueStateService, useValue: reviewQueueStateSpy },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(ReviewQueue);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load summary and inspection reports on mount', () => {
    expect(component).toBeTruthy();
    expect(inspectionReportsServiceSpy.getSummary).toHaveBeenCalledTimes(1);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledTimes(1);
    expect(component.summary()).toEqual(MOCK_INSPECTION_SUMMARY);
    expect(component.reports().length).toBe(MOCK_INSPECTION_REPORTS.length);
    expect(reviewQueueStateSpy.setPendingCount).toHaveBeenCalledWith(
      MOCK_INSPECTION_SUMMARY.pendingReviewCount
    );
    expect(component.isLoadingReports()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should filter reports by search query', () => {
    inspectionReportsServiceSpy.getReports.mockClear();

    component.handleSearch('AIR-2048');
    expect(component.searchTerm()).toBe('AIR-2048');
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledWith({
      search: 'AIR-2048',
    });
  });

  it('should filter reports by status select', () => {
    inspectionReportsServiceSpy.getReports.mockClear();

    component.handleStatusChange(InspectionReportStatus.Pending);
    expect(component.selectedStatus()).toBe(InspectionReportStatus.Pending);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledWith({
      status: InspectionReportStatus.Pending,
    });
  });

  it('should filter reports to pending when clicking "Show pending"', () => {
    inspectionReportsServiceSpy.getReports.mockClear();

    component.filterByStatus(InspectionReportStatus.Pending);
    expect(component.selectedStatus()).toBe(InspectionReportStatus.Pending);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledWith({
      status: InspectionReportStatus.Pending,
    });
  });

  it('should filter reports to reviewed when clicking "Show reviewed"', () => {
    inspectionReportsServiceSpy.getReports.mockClear();

    component.filterByStatus(InspectionReportStatus.Reviewed);
    expect(component.selectedStatus()).toBe(InspectionReportStatus.Reviewed);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledWith({
      status: InspectionReportStatus.Reviewed,
    });
  });

  it('should navigate to report detail on row click', () => {
    const targetRow = MOCK_INSPECTION_REPORTS[0];
    component.navigateToDetail(targetRow);

    expect(router.navigate).toHaveBeenCalledWith(['/review-queue', targetRow.reportId]);
  });

  it('should determine correct confidence progress color (green >=70%, amber below)', () => {
    expect(component.getConfidenceColor(0.70)).toBe('success');
    expect(component.getConfidenceColor(0.85)).toBe('success');
    expect(component.getConfidenceColor(0.69)).toBe('warning');
    expect(component.getConfidenceColor(0.50)).toBe('warning');

    expect(component.formatConfidencePercent(0.62)).toBe(62);
    expect(component.formatConfidencePercent(0.71)).toBe(71);
  });

  it('should map InspectionReportStatus to expected badge variants and labels', () => {
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.Pending)).toBe('warning');
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.Reviewed)).toBe('success');
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.SentToRetraining)).toBe('purple');

    expect(getInspectionReportStatusLabel(InspectionReportStatus.Pending)).toBe('Pending');
    expect(getInspectionReportStatusLabel(InspectionReportStatus.Reviewed)).toBe('Reviewed');
    expect(getInspectionReportStatusLabel(InspectionReportStatus.SentToRetraining)).toBe('Sent to Retraining');
  });

  it('should render error state on load error and retry successfully', () => {
    inspectionReportsServiceSpy.getReports.mockReturnValueOnce(
      throwError(() => ({ message: 'Server down' }))
    );

    component.loadReports();

    expect(component.isLoadingReports()).toBe(false);
    expect(component.error()).toBeTruthy();

    inspectionReportsServiceSpy.getReports.mockReturnValueOnce(of(MOCK_INSPECTION_REPORTS));
    component.loadReports();

    expect(component.error()).toBeNull();
    expect(component.reports().length).toBe(MOCK_INSPECTION_REPORTS.length);
  });
});
