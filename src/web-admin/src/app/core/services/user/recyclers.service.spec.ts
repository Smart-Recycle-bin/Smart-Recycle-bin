import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecyclersService } from './recyclers.service';
import { ApiClientService } from '../api/api-client.service';
import { environment } from '@env/environment';
import { AccountStatus } from '@models/user/account-status.enum';

describe('RecyclersService', () => {
  let service: RecyclersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RecyclersService, ApiClientService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecyclersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should query recyclers with parameters', () => {
    service.getRecyclers({ search: 'Nour', status: AccountStatus.Active }).subscribe((page) => {
      expect(page.items).toEqual([]);
      expect(page.totalItems).toBe(0);
    });

    const req = httpMock.expectOne(
      (r) =>
        r.url === `${environment.apiBaseUrl}/admin/users` &&
        r.params.get('role') === 'USER_CITIZEN' &&
        r.params.get('query') === 'Nour' &&
        r.params.get('status') === 'active'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: [] });
  });

  it('should call suspend endpoint with reason', () => {
    service.suspendRecycler('U-10063', 'Suspected abuse').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/U-10063/suspend`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Suspected abuse' });
    req.flush({ success: true, data: { userId: 'U-10063', status: 'suspended' } });
  });

  it('should call unsuspend endpoint', () => {
    service.unsuspendRecycler('U-10063').subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/users/U-10063/unsuspend`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: { userId: 'U-10063', status: 'active' } });
  });
});
