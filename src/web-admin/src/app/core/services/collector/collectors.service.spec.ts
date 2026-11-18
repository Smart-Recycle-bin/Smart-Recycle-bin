import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CollectorsService } from './collectors.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { CollectorCredentialsMode } from '@models/collector/collector-credentials-mode.enum';

describe('CollectorsService', () => {
  let service: CollectorsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CollectorsService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CollectorsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query collectors list', () => {
    service.getCollectors({ district: 'Cairo' }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/collectors?district=Cairo`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('should provision new collector', () => {
    const payload = {
      displayName: 'New Collector',
      email: 'new@ecobin.eg',
      phoneNumber: '+201000000000',
      credentialsMode: CollectorCredentialsMode.InviteLink,
      district: 'Cairo',
    };
    service.createCollector(payload).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/collectors`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ success: true, data: { collectorId: 'C-007', email: payload.email, district: 'Cairo' } });
  });

  it('should update, view bins, and deactivate collector', () => {
    service.updateCollector('C-001', { phoneNumber: '+201111111111' }).subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/collectors/C-001`)
      .flush({ success: true, data: {} });

    service.getAssignedBins('C-001').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/collectors/C-001/bins`)
      .flush({ success: true, data: [] });

    service.deactivateCollector('C-001').subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/collectors/C-001/deactivate`)
      .flush({ success: true, data: { collectorId: 'C-001', status: 'inactive' } });
  });
});
