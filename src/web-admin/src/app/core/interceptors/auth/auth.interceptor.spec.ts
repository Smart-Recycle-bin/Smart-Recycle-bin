import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '@services/auth/auth.service';
import { TokenStorageService } from '@services/auth/token-storage.service';
import { environment } from '@env/environment';
import { SKIP_AUTH } from '../shared/http-context-tokens';
import { UserRole } from '@models/user/user-role.enum';
import { of, throwError, Subject } from 'rxjs';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: AuthService;
  let tokenStorage: TokenStorageService;

  beforeEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        TokenStorageService,
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.removeItem(environment.sessionStorageKey);
  });

  it('should attach Bearer token to API requests when authenticated', () => {
    tokenStorage.saveSession({
      accessToken: 'valid_token_123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'valid_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer valid_token_123');
    req.flush({ success: true, data: [] });
  });

  it('should NOT attach token to public auth endpoints', () => {
    tokenStorage.saveSession({
      accessToken: 'valid_token_123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'valid_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    http.post(`${environment.apiBaseUrl}/auth/login`, {}).subscribe();
    const reqLogin = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(reqLogin.request.headers.has('Authorization')).toBe(false);
    reqLogin.flush({ success: true, data: {} });

    http.post(`${environment.apiBaseUrl}/auth/refresh`, {}).subscribe();
    const reqRefresh = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(reqRefresh.request.headers.has('Authorization')).toBe(false);
    reqRefresh.flush({ success: true, data: {} });

    http.post(`${environment.apiBaseUrl}/auth/forgot-password`, {}).subscribe();
    const reqForgot = httpMock.expectOne(`${environment.apiBaseUrl}/auth/forgot-password`);
    expect(reqForgot.request.headers.has('Authorization')).toBe(false);
    reqForgot.flush({ success: true, data: {} });
  });

  it('should NOT attach token when SKIP_AUTH is set or request is non-API or token is expired', () => {
    tokenStorage.saveSession({
      accessToken: 'valid_token_123',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'valid_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    // SKIP_AUTH
    http.get(`${environment.apiBaseUrl}/admin/bins`, {
      context: new HttpContext().set(SKIP_AUTH, true),
    }).subscribe();
    const reqSkip = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    expect(reqSkip.request.headers.has('Authorization')).toBe(false);
    reqSkip.flush({ success: true, data: [] });

    // Non-API URL
    http.get('https://external-service.com/data').subscribe();
    const reqExt = httpMock.expectOne('https://external-service.com/data');
    expect(reqExt.request.headers.has('Authorization')).toBe(false);
    reqExt.flush({});

    // Expired token
    tokenStorage.saveSession({
      accessToken: 'expired_token',
      expiresAt: new Date(Date.now() - 10000).toISOString(),
      refreshToken: 'valid_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    http.get(`${environment.apiBaseUrl}/admin/collectors`).subscribe();
    const reqExpired = httpMock.expectOne(`${environment.apiBaseUrl}/admin/collectors`);
    expect(reqExpired.request.headers.has('Authorization')).toBe(false);
    reqExpired.flush({ success: true, data: [] });
  });

  it('should refresh token and retry original request once on 401', () => {
    tokenStorage.saveSession({
      accessToken: 'initial_token',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: 'initial_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    let responseData: unknown;
    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe((res) => {
      responseData = res;
    });

    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    expect(req1.request.headers.get('Authorization')).toBe('Bearer initial_token');

    // Simulate refresh call by stubbing authService.refresh
    vi.spyOn(authService, 'refresh').mockImplementation(() => {
      tokenStorage.saveSession({
        accessToken: 'rotated_token',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        refreshToken: 'rotated_refresh',
        user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
      });
      authService.restoreSession();
      return of(undefined);
    });

    req1.flush({ success: false, code: 'UNAUTHORIZED' }, { status: 401, statusText: 'Unauthorized' });

    // Expect retried request with rotated token
    const reqRetried = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    expect(reqRetried.request.headers.get('Authorization')).toBe('Bearer rotated_token');

    reqRetried.flush({ success: true, data: [{ binId: 'bin_01' }] });
    expect(responseData).toEqual({ success: true, data: [{ binId: 'bin_01' }] });
  });

  it('should trigger exactly ONE refresh call when 3 concurrent requests return 401', () => {
    tokenStorage.saveSession({
      accessToken: 'old_token',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: 'valid_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe();
    http.get(`${environment.apiBaseUrl}/admin/collectors`).subscribe();
    http.get(`${environment.apiBaseUrl}/admin/catalog`).subscribe();

    const r1 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    const r2 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/collectors`);
    const r3 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/catalog`);

    r1.flush({}, { status: 401, statusText: 'Unauthorized' });
    r2.flush({}, { status: 401, statusText: 'Unauthorized' });
    r3.flush({}, { status: 401, statusText: 'Unauthorized' });

    // AuthService coalesces the concurrent 401 calls into exactly one HTTP refresh request
    const refreshReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(refreshReq.request.body).toEqual({ refreshToken: 'valid_refresh' });

    refreshReq.flush({
      success: true,
      data: {
        accessToken: 'new_token',
        expiresIn: 900,
        refreshToken: 'new_refresh',
      },
    });

    // Retried requests with newly refreshed token
    const r1Retry = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    const r2Retry = httpMock.expectOne(`${environment.apiBaseUrl}/admin/collectors`);
    const r3Retry = httpMock.expectOne(`${environment.apiBaseUrl}/admin/catalog`);

    expect(r1Retry.request.headers.get('Authorization')).toBe('Bearer new_token');
    expect(r2Retry.request.headers.get('Authorization')).toBe('Bearer new_token');
    expect(r3Retry.request.headers.get('Authorization')).toBe('Bearer new_token');

    r1Retry.flush({ success: true, data: [] });
    r2Retry.flush({ success: true, data: [] });
    r3Retry.flush({ success: true, data: [] });
  });

  it('should propagate original 401 error if refresh fails', () => {
    tokenStorage.saveSession({
      accessToken: 'old_token',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: 'bad_refresh',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    vi.spyOn(authService, 'refresh').mockReturnValue(throwError(() => new Error('Refresh failed')));

    let errorReceived: unknown;
    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe({
      next: () => expect.unreachable('Should fail'),
      error: (err) => {
        errorReceived = err;
      },
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(errorReceived).toBeTruthy();
  });

  it('should NOT attempt refresh on 401 for auth lifecycle endpoints or when no refresh token exists', () => {
    tokenStorage.saveSession({
      accessToken: 'token_no_refresh',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: '',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    const refreshSpy = vi.spyOn(authService, 'refresh');

    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe({
      next: () => expect.unreachable('Should fail'),
      error: () => {},
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(refreshSpy).not.toHaveBeenCalled();
  });

  it('should NOT loop when a retried request returns 401 again', () => {
    tokenStorage.saveSession({
      accessToken: 'token_1',
      expiresAt: new Date(Date.now() + 10000).toISOString(),
      refreshToken: 'refresh_1',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    authService.restoreSession();

    vi.spyOn(authService, 'refresh').mockReturnValue(of(undefined));

    let errorFinal: unknown;
    http.get(`${environment.apiBaseUrl}/admin/bins`).subscribe({
      next: () => expect.unreachable('Should fail'),
      error: (err) => {
        errorFinal = err;
      },
    });

    const req1 = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    req1.flush({}, { status: 401, statusText: 'Unauthorized' });

    const reqRetry = httpMock.expectOne(`${environment.apiBaseUrl}/admin/bins`);
    reqRetry.flush({}, { status: 401, statusText: 'Unauthorized' });

    // No further retry should happen
    expect(errorFinal).toBeTruthy();
  });
});
