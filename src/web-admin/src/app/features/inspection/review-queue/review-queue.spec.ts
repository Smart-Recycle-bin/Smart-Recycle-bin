import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReviewQueue } from './review-queue';
import { InspectionReportsService } from '@services/inspection/inspection-reports.service';
import { ReviewQueueStateService } from '@services/inspection/review-queue-state.service';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';
import { MOCK_INSPECTION_REPORTS, MOCK_INSPECTION_SUMMARY } from '@core/mock/data/inspection/inspection.mock';
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
    refresh: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.useFakeTimers();

    inspectionReportsServiceSpy = {
      getSummary: vi.fn().mockReturnValue(of(MOCK_INSPECTION_SUMMARY)),
      getReports: vi.fn().mockReturnValue(
        of({
          items: MOCK_INSPECTION_REPORTS,
          page: 1,
          pageSize: 10,
          totalItems: 28,
          totalPages: 3,
        })
      ),
    };

    reviewQueueStateSpy = {
      setPendingCount: vi.fn(),
      refresh: vi.fn().mockReturnValue(of(MOCK_INSPECTION_SUMMARY)),
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
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize and load summary and inspection reports on mount via pagedList', () => {
    expect(component).toBeTruthy();
    expect(reviewQueueStateSpy.refresh).toHaveBeenCalledTimes(1);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledTimes(1);
    expect(component.summary()).toEqual(MOCK_INSPECTION_SUMMARY);
    expect(component.pagedList.items().length).toBe(MOCK_INSPECTION_REPORTS.length);
    expect(component.pagedList.loading()).toBe(false);
  });

  it('debounces rapid search keystrokes: typing "AIR-2048" fires exactly 1 request', () => {
    inspectionReportsServiceSpy.getReports.mockClear();

    component.handleSearch('A');
    vi.advanceTimersByTime(50);
    component.handleSearch('AIR');
    vi.advanceTimersByTime(50);
    component.handleSearch('AIR-2048');

    expect(inspectionReportsServiceSpy.getReports).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledTimes(1);
    expect(inspectionReportsServiceSpy.getReports).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'AIR-2048',
        page: 1,
      })
    );
  });

  it('handles race conditions: slow first request is cancelled by faster second request', () => {
    const slowSubject = new Subject<any>();
    const fastSubject = new Subject<any>();
    let call = 0;

    inspectionReportsServiceSpy.getReports.mockImplementation(() => {
      call++;
      return call === 1 ? slowSubject : fastSubject;
    });

    component.pagedList.setPage(2);
    component.pagedList.setPage(3);

    fastSubject.next({
      items: [{ ...MOCK_INSPECTION_REPORTS[0], reportId: 'AIR-FAST' }],
      page: 3,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    fastSubject.complete();

    expect(component.pagedList.items()[0].reportId).toBe('AIR-FAST');

    slowSubject.next({
      items: [{ ...MOCK_INSPECTION_REPORTS[0], reportId: 'AIR-SLOW' }],
      page: 2,
      pageSize: 10,
      totalItems: 30,
      totalPages: 3,
    });
    slowSubject.complete();

    expect(component.pagedList.items()[0].reportId).toBe('AIR-FAST');
  });

  it('resets page to 1 on filter changes', () => {
    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.handleStatusChange(InspectionReportStatus.Pending);
    expect(component.pagedList.page()).toBe(1);

    component.pagedList.setPage(2);
    expect(component.pagedList.page()).toBe(2);

    component.filterByStatus(InspectionReportStatus.Reviewed);
    expect(component.pagedList.page()).toBe(1);
  });

  it('should navigate to report detail page on row click', () => {
    const sampleRow = MOCK_INSPECTION_REPORTS[0];
    component.navigateToDetail(sampleRow);

    expect(router.navigate).toHaveBeenCalledWith(['/review-queue', sampleRow.reportId]);
  });

  it('should format confidence percentages and determine progress color', () => {
    expect(component.formatConfidencePercent(0.684)).toBe(68);
    expect(component.formatConfidencePercent(0.952)).toBe(95);

    expect(component.getConfidenceColor(0.85)).toBe('success');
    expect(component.getConfidenceColor(0.65)).toBe('warning');
  });

  it('should map inspection report status to correct badge variant and label', () => {
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.Pending)).toBe('warning');
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.SentToRetraining)).toBe('purple');
    expect(getInspectionReportStatusBadgeVariant(InspectionReportStatus.Reviewed)).toBe('success');
    expect(getInspectionReportStatusBadgeVariant('unknown')).toBe('neutral');

    expect(getInspectionReportStatusLabel(InspectionReportStatus.Pending)).toBe('Pending');
    expect(getInspectionReportStatusLabel(InspectionReportStatus.Reviewed)).toBe('Reviewed');
    expect(getInspectionReportStatusLabel(InspectionReportStatus.SentToRetraining)).toBe('Sent to Retraining');
  });
});
