import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AnalyticsService } from './analytics.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { AnalyticsPeriod } from '@models/analytics/analytics-period.enum';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query overview data with period parameter', () => {
    service.getOverview({ period: AnalyticsPeriod.SevenDays }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/analytics?period=7d`);
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: {} });
  });
});
