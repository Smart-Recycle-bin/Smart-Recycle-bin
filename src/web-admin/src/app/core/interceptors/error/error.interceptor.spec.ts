import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { errorInterceptor } from './error.interceptor';
import { AuthService } from '@services/auth/auth.service';
import { ToastService } from '@services/toast/toast.service';
import { SKIP_ERROR_HANDLING } from '../shared/http-context-tokens';
import { ApiError } from '@core/errors/api-error';
import { ApiErrorCode } from '@models/common/api-error-code.enum';

describe('errorInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authServiceSpy: { clearSession: ReturnType<typeof vi.fn> };
  let toastServiceSpy: {
    error: ReturnType<typeof vi.fn>;
    warning: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
    success: ReturnType<typeof vi.fn>;
  };
  let routerSpy: { navigate: ReturnType<typeof vi.fn>; url: string };

  beforeEach(() => {
    authServiceSpy = {
      clearSession: vi.fn(),
    };
    toastServiceSpy = {
      error: vi.fn(),
      warning: vi.fn(),
      info: vi.fn(),
      success: vi.fn(),
    };
    routerSpy = {
      navigate: vi.fn(),
      url: '/dashboard',
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('passes successful requests through unchanged', () => {
    let result: unknown = null;
    httpClient.get('/api/v1/test').subscribe((res) => {
      result = res;
    });

    const req = httpMock.expectOne('/api/v1/test');
    req.flush({ success: true, data: { message: 'ok' } });

    expect(result).toEqual({ success: true, data: { message: 'ok' } });
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
  });

  it('handles 401 on regular endpoint by clearing session, redirecting, and showing toast', () => {
    let caughtError: unknown = null;
    httpClient.get('/api/v1/bins').subscribe({
      next: () => expect.unreachable('Should have failed with 401'),
      error: (err) => {
        caughtError = err;
      },
    });

    const req = httpMock.expectOne('/api/v1/bins');
    req.flush({ success: false, error: { code: 'UNAUTHORIZED' } }, { status: 401, statusText: 'Unauthorized' });

    expect(caughtError).toBeInstanceOf(ApiError);
    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' },
    });
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Session expired. Please sign in again.');
  });

  it('does not redirect or toast on 401 if already on /login', () => {
    routerSpy.url = '/login?returnUrl=%2Fdashboard';

    httpClient.get('/api/v1/bins').subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: () => {},
    });

    const req = httpMock.expectOne('/api/v1/bins');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('does not redirect or toast on 401 from login endpoint', () => {
    httpClient.post('/api/v1/auth/login', {}).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe(ApiErrorCode.InvalidCredentials);
      },
    });

    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush(
      { success: false, error: { code: ApiErrorCode.InvalidCredentials, message: 'Invalid credentials' } },
      { status: 401, statusText: 'Unauthorized' }
    );

    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('does not redirect or toast on 401 from logout endpoint', () => {
    httpClient.post('/api/v1/auth/logout', {}).subscribe({
      next: () => expect.unreachable('Should have failed'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
      },
    });

    const req = httpMock.expectOne('/api/v1/auth/logout');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('handles 403 Forbidden by showing toast without logging out', () => {
    httpClient.get('/api/v1/admin/audit').subscribe({
      next: () => expect.unreachable('Should have failed with 403'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
      },
    });

    const req = httpMock.expectOne('/api/v1/admin/audit');
    req.flush({}, { status: 403, statusText: 'Forbidden' });

    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      "You don't have permission to perform this action."
    );
  });

  it('does not show toast for 403 ACCOUNT_SUSPENDED on login', () => {
    httpClient.post('/api/v1/auth/login', {}).subscribe({
      next: () => expect.unreachable('Should have failed with 403'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe(ApiErrorCode.AccountSuspended);
      },
    });

    const req = httpMock.expectOne('/api/v1/auth/login');
    req.flush(
      { success: false, error: { code: ApiErrorCode.AccountSuspended, message: 'Suspended' } },
      { status: 403, statusText: 'Forbidden' }
    );

    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('handles status 0 (network error) with appropriate toast', () => {
    httpClient.get('/api/v1/bins').subscribe({
      next: () => expect.unreachable('Should have failed with status 0'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(0);
      },
    });

    const req = httpMock.expectOne('/api/v1/bins');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'Network error. Please check your internet connection.'
    );
  });

  it('handles status 500 server errors with server error toast', () => {
    httpClient.get('/api/v1/bins').subscribe({
      next: () => expect.unreachable('Should have failed with 500'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).status).toBe(500);
      },
    });

    const req = httpMock.expectOne('/api/v1/bins');
    req.flush({ message: 'Internal Crash' }, { status: 500, statusText: 'Internal Server Error' });

    expect(toastServiceSpy.error).toHaveBeenCalledWith(
      'A server error occurred. Please try again later.'
    );
  });

  it('does not show toast for silent business errors like VALIDATION_ERROR or INSUFFICIENT_BALANCE', () => {
    httpClient.post('/api/v1/rewards', {}).subscribe({
      next: () => expect.unreachable('Should have failed with 400'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe(ApiErrorCode.ValidationError);
      },
    });

    const req = httpMock.expectOne('/api/v1/rewards');
    req.flush(
      { success: false, error: { code: ApiErrorCode.ValidationError, message: 'Invalid payload' } },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('bypasses toasts and redirects when SKIP_ERROR_HANDLING is true', () => {
    const context = new HttpContext().set(SKIP_ERROR_HANDLING, true);

    httpClient.get('/api/v1/bins', { context }).subscribe({
      next: () => expect.unreachable('Should fail with 401'),
      error: (err) => {
        expect(err).toBeInstanceOf(ApiError);
      },
    });

    const req = httpMock.expectOne('/api/v1/bins');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });
});
