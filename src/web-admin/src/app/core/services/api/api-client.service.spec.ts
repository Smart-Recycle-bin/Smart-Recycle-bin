import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApiClientService } from './api-client.service';
import { environment } from '../../../../environments/environment';

describe('ApiClientService', () => {
  let service: ApiClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ApiClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should prefix apiBaseUrl and unwrap { success, data } on GET', () => {
    const mockData = { test: 123 };
    let result: unknown;

    service.get<{ test: number }>('/test-endpoint').subscribe((data) => {
      result = data;
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/test-endpoint`);
    expect(req.request.method).toBe('GET');

    req.flush({ success: true, data: mockData });
    expect(result).toEqual(mockData);
  });

  it('should skip null, undefined, and empty string parameters when building query params', () => {
    service
      .get('/test-params', {
        params: {
          search: 'clean',
          empty: '',
          nil: null,
          undef: undefined,
          count: 10,
        },
      })
      .subscribe();

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiBaseUrl}/test-params` &&
        r.params.has('search') &&
        r.params.get('search') === 'clean' &&
        r.params.has('count') &&
        r.params.get('count') === '10' &&
        !r.params.has('empty') &&
        !r.params.has('nil') &&
        !r.params.has('undef')
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: {} });
  });

  it('should unwrap data on POST, PUT, PATCH, and DELETE', () => {
    service.post('/test-post', { name: 'item' }).subscribe((d) => expect(d).toBe('posted'));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/test-post`)
      .flush({ success: true, data: 'posted' });

    service.put('/test-put', { name: 'update' }).subscribe((d) => expect(d).toBe('updated'));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/test-put`)
      .flush({ success: true, data: 'updated' });

    service.patch('/test-patch', { field: 1 }).subscribe((d) => expect(d).toBe('patched'));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/test-patch`)
      .flush({ success: true, data: 'patched' });

    service.delete('/test-delete').subscribe((d) => expect(d).toBe('deleted'));
    httpMock
      .expectOne(`${environment.apiBaseUrl}/test-delete`)
      .flush({ success: true, data: 'deleted' });
  });
});
