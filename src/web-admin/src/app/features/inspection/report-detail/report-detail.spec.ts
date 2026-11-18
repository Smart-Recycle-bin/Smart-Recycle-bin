import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReportDetail } from './report-detail';
import { InspectionReportsService } from '@services/inspection/inspection-reports.service';
import { ReviewQueueStateService } from '@services/inspection/review-queue-state.service';
import { ToastService } from '@services/toast/toast.service';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';
import { formatDateTime } from '@shared/utils/datetime';
import {
  MOCK_INSPECTION_DETAILS,
  MOCK_INSPECTION_SUMMARY,
  MOCK_WASTE_TYPE_OPTIONS,
} from '@core/mock/data/inspection/inspection.mock';

describe('ReportDetail Component', () => {
  let component: ReportDetail;
  let fixture: ComponentFixture<ReportDetail>;
  let inspectionReportsServiceSpy: {
    getReportDetail: ReturnType<typeof vi.fn>;
    getWasteTypeOptions: ReturnType<typeof vi.fn>;
    correctCategory: ReturnType<typeof vi.fn>;
    dismissReport: ReturnType<typeof vi.fn>;
    sendToRetraining: ReturnType<typeof vi.fn>;
  };
  let reviewQueueStateSpy: {
    refresh: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  const samplePendingDetail = MOCK_INSPECTION_DETAILS['AIR-2048'];
  const sampleReviewedDetail = {
    ...samplePendingDetail,
    reportId: 'AIR-2045',
    airId: 'AIR-2045',
    status: InspectionReportStatus.Reviewed,
  };

  beforeEach(async () => {
    inspectionReportsServiceSpy = {
      getReportDetail: vi.fn().mockReturnValue(of(samplePendingDetail)),
      getWasteTypeOptions: vi.fn().mockReturnValue(of(MOCK_WASTE_TYPE_OPTIONS)),
      correctCategory: vi.fn().mockReturnValue(
        of({
          reportId: samplePendingDetail.reportId,
          status: InspectionReportStatus.Reviewed,
          message: 'Category corrected successfully',
          resolvedAt: new Date().toISOString(),
        })
      ),
      dismissReport: vi.fn().mockReturnValue(
        of({
          reportId: samplePendingDetail.reportId,
          status: InspectionReportStatus.Reviewed,
          message: 'Report dismissed',
          resolvedAt: new Date().toISOString(),
        })
      ),
      sendToRetraining: vi.fn().mockReturnValue(
        of({
          reportId: samplePendingDetail.reportId,
          status: InspectionReportStatus.SentToRetraining,
          message: 'Report sent to retraining dataset',
          resolvedAt: new Date().toISOString(),
        })
      ),
    };

    reviewQueueStateSpy = {
      refresh: vi.fn().mockReturnValue(of(MOCK_INSPECTION_SUMMARY)),
    };

    toastServiceSpy = {
      success: vi.fn(),
      error: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [ReportDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => (key === 'reportId' ? 'AIR-2048' : null),
              },
            },
          },
        },
        { provide: InspectionReportsService, useValue: inspectionReportsServiceSpy },
        { provide: ReviewQueueStateService, useValue: reviewQueueStateSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportDetail);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('should initialize and load report detail and waste types on mount', () => {
    expect(component).toBeTruthy();
    expect(inspectionReportsServiceSpy.getReportDetail).toHaveBeenCalledWith('AIR-2048');
    expect(inspectionReportsServiceSpy.getWasteTypeOptions).toHaveBeenCalledTimes(1);
    expect(component.report()).toEqual(samplePendingDetail);
    expect(component.isPending()).toBe(true);
    expect(component.headerTitle()).toBe(`${samplePendingDetail.airId} · Session ${samplePendingDetail.sessionId}`);
    expect(component.headerSubtitle()).toBe(
      `${samplePendingDetail.binId} · ${samplePendingDetail.userName} · ${formatDateTime(samplePendingDetail.date)}`
    );
  });

  it('should open zoom modal when clicking a captured frame and close it', () => {
    const frame = samplePendingDetail.capturedFrames[0];
    component.openZoomModal(frame);

    expect(component.isZoomModalOpen()).toBe(true);
    expect(component.zoomedFrameUrl()).toBe(frame);

    component.closeZoomModal();
    expect(component.isZoomModalOpen()).toBe(false);
    expect(component.zoomedFrameUrl()).toBeNull();
  });

  it('should correctly compute confidence breakdown entries', () => {
    const entries = component.confidenceEntries();
    expect(entries.length).toBe(4);
    expect(entries[0].className).toBe('Plastic (PET)');
    expect(entries[0].percent).toBe(62);
    expect(entries[0].color).toBe('warning');
  });

  it('should apply correct category, show toast, and refresh badge via reviewQueueState', () => {
    inspectionReportsServiceSpy.getReportDetail.mockClear();

    component.selectedWasteType.set('Glass');
    component.applyCorrectCategory();

    expect(inspectionReportsServiceSpy.correctCategory).toHaveBeenCalledWith('AIR-2048', {
      wasteTypeId: 'Glass',
      adminJustification: 'Corrected category per user survey rejection review',
    });
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(inspectionReportsServiceSpy.getReportDetail).toHaveBeenCalledWith('AIR-2048');
    expect(reviewQueueStateSpy.refresh).toHaveBeenCalled();
  });

  it('should apply dismiss action, show toast, and refresh badge', () => {
    component.applyDismiss();

    expect(inspectionReportsServiceSpy.dismissReport).toHaveBeenCalledWith('AIR-2048');
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(reviewQueueStateSpy.refresh).toHaveBeenCalled();
  });

  it('should apply send to retraining action, show toast, and refresh badge', () => {
    component.selectedWasteType.set('Plastic (PET)');
    component.applyRetrain();

    expect(inspectionReportsServiceSpy.sendToRetraining).toHaveBeenCalledWith(
      'AIR-2048',
      'Plastic (PET)'
    );
    expect(toastServiceSpy.success).toHaveBeenCalled();
    expect(reviewQueueStateSpy.refresh).toHaveBeenCalled();
  });

  it('should disable all actions when report is already reviewed', () => {
    component.report.set(sampleReviewedDetail);
    expect(component.isPending()).toBe(false);

    component.applyCorrectCategory();
    component.applyDismiss();
    component.applyRetrain();

    expect(inspectionReportsServiceSpy.correctCategory).not.toHaveBeenCalled();
    expect(inspectionReportsServiceSpy.dismissReport).not.toHaveBeenCalled();
    expect(inspectionReportsServiceSpy.sendToRetraining).not.toHaveBeenCalled();
  });

  it('should render error state on initial load failure and retry successfully', () => {
    inspectionReportsServiceSpy.getReportDetail.mockReturnValueOnce(
      throwError(() => ({ message: 'Report not found' }))
    );

    component.loadDetail();

    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeTruthy();

    inspectionReportsServiceSpy.getReportDetail.mockReturnValueOnce(of(samplePendingDetail));
    component.loadDetail();

    expect(component.error()).toBeNull();
    expect(component.report()).toEqual(samplePendingDetail);
  });

  it('should detect 404 / NOT_FOUND and display not found empty state', () => {
    inspectionReportsServiceSpy.getReportDetail.mockReturnValueOnce(
      throwError(() => ({ status: 404, code: 'NOT_FOUND', message: 'Report not found' }))
    );

    component.loadDetail();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(component.isNotFound()).toBe(true);

    const notFoundEl = fixture.nativeElement.querySelector('[data-testid="report-not-found"]');
    expect(notFoundEl).toBeTruthy();
    expect(notFoundEl.textContent).toContain('Report not found');
  });
});
