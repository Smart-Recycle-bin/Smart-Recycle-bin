import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SurveyQaService } from './survey-qa.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';

describe('SurveyQaService', () => {
  let service: SurveyQaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SurveyQaService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(SurveyQaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch QA summary and recent surveys', () => {
    service.getQaSummary().subscribe();
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/survey-qa`)
      .flush({ success: true, data: { confirmCount: 17040 } });

    service.getRecentSurveys().subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });
    httpMock
      .expectOne(`${environment.apiBaseUrl}/admin/survey-qa/recent`)
      .flush({ success: true, data: [] });
  });
});
