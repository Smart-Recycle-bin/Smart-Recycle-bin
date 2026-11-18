import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';
import { ApiClientService } from '../api/api-client.service';
import { UserRole } from '@models/user/user-role.enum';
import { LoginResponse, StoredSession } from '@models/auth/auth.dto';
import { environment } from '@env/environment';
import { AuthError } from '@core/errors/auth-error';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let tokenStorage: TokenStorageService;

  const validAdminLoginResponse: LoginResponse = {
    accessToken: 'access_adm_1',
    expiresIn: 900,
    refreshToken: 'refresh_adm_1',
    user: {
      userId: 'ADM-001',
      displayName: 'Laila Hamdy',
      role: UserRole.Admin,
    },
  };

  beforeEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ApiClientService,
        TokenStorageService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    tokenStorage = TestBed.inject(TokenStorageService);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
    localStorage.removeItem(environment.sessionStorageKey);
  });

  it('should store tokens on successful admin login', () => {
    service.login({ email: 'admin@ecobin.eg', password: 'password123' }).subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ success: true, data: validAdminLoginResponse });

    expect(service.isAuthenticated()).toBe(true);
    expect(service.accessToken()).toBe('access_adm_1');
    expect(service.hasRefreshToken()).toBe(true);
    expect(service.role()).toBe(UserRole.Admin);

    const stored = tokenStorage.getSession();
    expect(stored).toBeTruthy();
    expect(stored?.accessToken).toBe('access_adm_1');
  });

  it('should reject non-admin login, revoke refresh token via logout, and throw typed AuthError', () => {
    let errorCaught: unknown = null;
    service.login({ email: 'citizen@ecobin.eg', password: 'password123' }).subscribe({
      next: () => expect.unreachable('Should have rejected non-admin'),
      error: (err: unknown) => {
        errorCaught = err;
      },
    });

    const loginReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/login`);
    loginReq.flush({
      success: true,
      data: {
        ...validAdminLoginResponse,
        refreshToken: 'leaked_refresh_token',
        user: { ...validAdminLoginResponse.user, role: UserRole.Citizen },
      },
    });

    // Must best-effort revoke the issued refresh token
    const logoutReq = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(logoutReq.request.body).toEqual({ refreshToken: 'leaked_refresh_token' });
    logoutReq.flush({ success: true, data: { message: 'Logged out successfully' } });

    expect(errorCaught).toBeInstanceOf(AuthError);
    const authErr = errorCaught as AuthError;
    expect(authErr.code).toBe('NOT_ADMIN');
    expect(service.isAuthenticated()).toBe(false);
    expect(tokenStorage.getSession()).toBeNull();
  });

  it('should evaluate isAuthenticated as false when token is expired', () => {
    const expiredSession: StoredSession = {
      accessToken: 'expired_token',
      expiresAt: new Date(Date.now() - 10000).toISOString(),
      refreshToken: 'valid_refresh',
      user: {
        userId: 'ADM-001',
        displayName: 'Laila Hamdy',
        role: UserRole.Admin,
      },
    };

    tokenStorage.saveSession(expiredSession);
    service.restoreSession();

    expect(service.accessToken()).toBe('expired_token');
    expect(service.isAuthenticated()).toBe(false);
  });

  it('should reactively transition isAuthenticated to false when session expiresAt is reached', () => {
    vi.useFakeTimers();
    try {
      const futureSession: StoredSession = {
        accessToken: 'valid_access_token',
        expiresAt: new Date(Date.now() + 2000).toISOString(),
        refreshToken: 'valid_refresh',
        user: {
          userId: 'ADM-001',
          displayName: 'Laila Hamdy',
          role: UserRole.Admin,
        },
      };
      tokenStorage.saveSession(futureSession);
      service.restoreSession();

      expect(service.isAuthenticated()).toBe(true);

      // Advance time by 1000ms (still valid)
      vi.advanceTimersByTime(1000);
      expect(service.isAuthenticated()).toBe(true);

      // Advance time past expiresAt
      vi.advanceTimersByTime(1500);
      expect(service.isAuthenticated()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('should send refreshToken on logout and clear session locally even when request errors', () => {
    tokenStorage.saveSession({
      accessToken: 'token_to_logout',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'refresh_to_logout',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    service.restoreSession();

    service.logout().subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/logout`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ refreshToken: 'refresh_to_logout' });

    req.error(new ProgressEvent('Network error'), { status: 500, statusText: 'Server Error' });

    expect(service.isAuthenticated()).toBe(false);
    expect(service.session()).toBeNull();
    expect(tokenStorage.getSession()).toBeNull();
  });

  it('should hydrate state from storage on restoreSession', () => {
    const session: StoredSession = {
      accessToken: 'token_hydrated',
      expiresAt: new Date(Date.now() + 100000).toISOString(),
      refreshToken: 'refresh_hydrated',
      user: { userId: 'ADM-002', displayName: 'Amr Shawky', role: UserRole.Admin },
    };

    tokenStorage.saveSession(session);
    service.restoreSession();

    expect(service.session()?.accessToken).toBe('token_hydrated');
    expect(service.role()).toBe(UserRole.Admin);
  });

  it('should rotate both tokens upon refresh', () => {
    tokenStorage.saveSession({
      accessToken: 'old_access',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      refreshToken: 'old_refresh',
      user: { userId: 'ADM-001', displayName: 'Laila', role: UserRole.Admin },
    });
    service.restoreSession();

    service.refresh().subscribe();

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    expect(req.request.body).toEqual({ refreshToken: 'old_refresh' });

    req.flush({
      success: true,
      data: {
        accessToken: 'new_access',
        expiresIn: 900,
        refreshToken: 'new_refresh',
      },
    });

    expect(service.accessToken()).toBe('new_access');
    expect(tokenStorage.getSession()?.refreshToken).toBe('new_refresh');
  });

  it('should share single in-flight request when multiple concurrent refresh calls occur', () => {
    tokenStorage.saveSession({
      accessToken: 'token_1',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      refreshToken: 'refresh_1',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    service.restoreSession();

    service.refresh().subscribe();
    service.refresh().subscribe();

    const requests = httpMock.match(`${environment.apiBaseUrl}/auth/refresh`);
    expect(requests.length).toBe(1);

    requests[0]!.flush({
      success: true,
      data: {
        accessToken: 'token_shared',
        expiresIn: 900,
        refreshToken: 'refresh_shared',
      },
    });
  });

  it('should maintain single-flight refresh when first subscriber unsubscribes mid-flight', () => {
    tokenStorage.saveSession({
      accessToken: 'old_tok',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      refreshToken: 'single_use_refresh_token',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    service.restoreSession();

    // Subscriber 1 starts refresh then unsubscribes mid-flight
    const sub1 = service.refresh().subscribe();
    sub1.unsubscribe();

    // Subscriber 2 joins while request is in flight
    let sub2Completed = false;
    service.refresh().subscribe({
      next: () => {
        sub2Completed = true;
      },
    });

    // Exactly ONE HTTP request should have been dispatched
    const reqs = httpMock.match(`${environment.apiBaseUrl}/auth/refresh`);
    expect(reqs.length).toBe(1);

    reqs[0]!.flush({
      success: true,
      data: {
        accessToken: 'refreshed_access',
        expiresIn: 900,
        refreshToken: 'refreshed_refresh',
      },
    });

    expect(sub2Completed).toBe(true);
    expect(service.accessToken()).toBe('refreshed_access');
  });

  it('should clear session on 401/403 refresh failure', () => {
    tokenStorage.saveSession({
      accessToken: 'token_fail',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      refreshToken: 'refresh_fail',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    service.restoreSession();

    service.refresh().subscribe({
      next: () => expect.unreachable('Should error'),
      error: () => {},
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    req.flush(
      { success: false, error: { code: 'INVALID_REFRESH_TOKEN' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(service.session()).toBeNull();
    expect(tokenStorage.getSession()).toBeNull();
  });

  it('should preserve session on network failure during refresh', () => {
    tokenStorage.saveSession({
      accessToken: 'token_net_err',
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      refreshToken: 'refresh_net_err',
      user: { userId: 'ADM-001', displayName: 'Admin', role: UserRole.Admin },
    });
    service.restoreSession();

    service.refresh().subscribe({
      next: () => expect.unreachable('Should error'),
      error: () => {},
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/auth/refresh`);
    req.error(new ProgressEvent('Network Error'), { status: 0, statusText: 'Unknown Error' });

    // Session remains preserved so user is not logged out on transient network drop
    expect(service.session()).not.toBeNull();
    expect(tokenStorage.getSession()).not.toBeNull();
  });
});
