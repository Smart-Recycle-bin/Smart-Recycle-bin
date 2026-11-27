import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuditLogService } from './audit-log.service';
import { ApiClientService } from '../api/api-client.service';
import { resolveApiBaseUrl } from '@core/interceptors/shared/api-url';
import { AuditActionType } from '@models/audit/audit-action-type.enum';

const apiBaseUrl = resolveApiBaseUrl();

describe('AuditLogService', () => {
  let service: AuditLogService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuditLogService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuditLogService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query audit logs with parameters', () => {
    service.getAuditLogs({ actionType: AuditActionType.BinAssignment }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });

    const req = httpMock.expectOne(
      `${apiBaseUrl}/admin/audit-logs?actionType=BIN_ASSIGN`
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });
});
