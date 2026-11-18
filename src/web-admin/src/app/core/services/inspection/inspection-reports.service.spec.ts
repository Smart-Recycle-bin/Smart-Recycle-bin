import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InspectionReportsService } from './inspection-reports.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { InspectionReportStatus } from '@models/inspection/inspection-report-status.enum';

describe('InspectionReportsService', () => {
  let service: InspectionReportsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InspectionReportsService,
        ApiClientService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(InspectionReportsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch dataset summary and reports list', () => {
    service.getSummary().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections/summary`)
      .flush({ success: true, data: { labelledImagesCount: 1285 } });

    service.getReports({ status: InspectionReportStatus.Pending }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections?status=pending`)
      .flush({ success: true, data: [] });
  });

  it('should fetch report detail, correct, dismiss, and retrain', () => {
    service.getReportDetail('AIR-2048').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections/AIR-2048`)
      .flush({ success: true, data: { reportId: 'AIR-2048' } });

    service.correctCategory('AIR-2048', { wasteTypeId: 'wt-03' }).subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections/AIR-2048/correct`)
      .flush({ success: true, data: { status: 'Reviewed' } });

    service.dismissReport('AIR-2048').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections/AIR-2048/dismiss`)
      .flush({ success: true, data: { status: 'Reviewed' } });

    service.sendToRetraining('AIR-2048', 'Glass').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/inspections/AIR-2048/retrain`)
      .flush({ success: true, data: { status: 'Sent to Retraining' } });

    service.getWasteTypeOptions().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/waste-types`)
      .flush({ success: true, data: [] });
  });
});
