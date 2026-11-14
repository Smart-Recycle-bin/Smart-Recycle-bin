import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BinsService } from './bins.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '../../../../environments/environment';
import { BinStatus } from '../../models/bin/bin-status.enum';

describe('BinsService', () => {
  let service: BinsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BinsService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BinsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query bins list', () => {
    service.getBins({ status: BinStatus.Available }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins?status=AVAILABLE`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('should register a new smart bin', () => {
    const payload = {
      serialNumber: 'SN-1002',
      latitude: 30.05,
      longitude: 31.25,
      district: 'Cairo',
      capacityThresholdKg: 100,
    };
    service.registerBin(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { binId: 'bin_100', qrCode: 'qr_bin_100', status: 'AVAILABLE' } });
  });

  it('should assign a collector to a bin', () => {
    const payload = { collectorId: 'C-002' };
    service.assignCollector('BIN-0007', payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins/BIN-0007/assign`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { binId: 'BIN-0007', assignedCollectorId: 'C-002' } });
  });
});
