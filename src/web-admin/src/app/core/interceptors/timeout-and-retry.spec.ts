import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpContext,
  HttpErrorResponse,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { map, of, throwError, timer } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { timeoutInterceptor } from './timeout/timeout.interceptor';
import { retryInterceptor } from './retry/retry.interceptor';
import { REQUEST_TIMEOUT } from './shared/http-context-tokens';
import { ToastService } from '@services/toast/toast.service';
import { ApiError } from '../errors/api-error';

describe('Timeout & Retry Interceptors', () => {
  let toastServiceMock: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    toastServiceMock = { error: vi.fn() };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeoutInterceptor', () => {
    it('times out after 30 seconds by default and emits ApiError with code TIMEOUT and error toast', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: ToastService, useValue: toastServiceMock },
        ],
      });

      const req = new HttpRequest('GET', '/api/v1/test');
      // Never completes within 30s
      const next: HttpHandlerFn = () =>
        timer(35000).pipe(map(() => new HttpResponse<unknown>({ status: 200 })));

      let caughtError: unknown;
      TestBed.runInInjectionContext(() => {
        timeoutInterceptor(req, next).subscribe({
          error: (err) => {
            caughtError = err;
          },
        });
      });

      vi.advanceTimersByTime(29999);
      expect(caughtError).toBeUndefined();

      vi.advanceTimersByTime(2); // 30001 ms
      expect(caughtError).toBeInstanceOf(ApiError);
      expect((caughtError as ApiError).code).toBe('TIMEOUT');
      expect((caughtError as ApiError).status).toBe(408);
      expect(toastServiceMock.error).toHaveBeenCalledWith('Request timed out');
    });

    it('honors REQUEST_TIMEOUT token (e.g. 120s for file uploads)', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: ToastService, useValue: toastServiceMock },
        ],
      });

      const context = new HttpContext().set(REQUEST_TIMEOUT, 120000);
      const req = new HttpRequest('POST', '/api/v1/upload', {}, { context });
      const next: HttpHandlerFn = () =>
        timer(125000).pipe(map(() => new HttpResponse<unknown>({ status: 200 })));

      let caughtError: unknown;
      TestBed.runInInjectionContext(() => {
        timeoutInterceptor(req, next).subscribe({
          error: (err) => {
            caughtError = err;
          },
        });
      });

      vi.advanceTimersByTime(35000); // Beyond default 30s
      expect(caughtError).toBeUndefined();

      vi.advanceTimersByTime(85002); // 120002 ms
      expect(caughtError).toBeInstanceOf(ApiError);
      expect((caughtError as ApiError).code).toBe('TIMEOUT');
    });

    it('allows timely responses through without timeout', () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: ToastService, useValue: toastServiceMock },
        ],
      });

      const req = new HttpRequest('GET', '/api/v1/fast');
      const next: HttpHandlerFn = () => of(new HttpResponse({ status: 200, body: { ok: true } }));

      let response: any;
      TestBed.runInInjectionContext(() => {
        timeoutInterceptor(req, next).subscribe((res) => {
          response = res;
        });
      });

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(toastServiceMock.error).not.toHaveBeenCalled();
    });
  });

  describe('retryInterceptor', () => {
    it('retries GET requests once upon network error (status 0)', () => {
      const req = new HttpRequest('GET', '/api/v1/items');
      let attempts = 0;

      const next: HttpHandlerFn = () => {
        attempts++;
        if (attempts === 1) {
          return throwError(() => new HttpErrorResponse({ status: 0, statusText: 'Network Error' }));
        }
        return of(new HttpResponse({ status: 200, body: ['item1', 'item2'] }));
      };

      let successResponse: any;
      let unexpectedError: unknown;
      TestBed.runInInjectionContext(() => {
        retryInterceptor(req, next).subscribe({
          next: (res) => {
            successResponse = res;
          },
          error: (err) => {
            unexpectedError = err;
          },
        });
      });

      expect(attempts).toBe(1);
      // Advance past backoff timer (300ms + max 100ms jitter)
      vi.advanceTimersByTime(450);

      expect(unexpectedError).toBeUndefined();
      expect(attempts).toBe(2);
      expect(successResponse).toBeDefined();
      expect(successResponse.status).toBe(200);
    });

    it('retries GET requests once upon 503 gateway error, but stops after 1 retry', () => {
      const req = new HttpRequest('GET', '/api/v1/items');
      let attempts = 0;

      const next: HttpHandlerFn = () => {
        attempts++;
        return throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }));
      };

      let errorReceived: unknown;
      TestBed.runInInjectionContext(() => {
        retryInterceptor(req, next).subscribe({
          error: (err) => {
            errorReceived = err;
          },
        });
      });

      expect(attempts).toBe(1);
      vi.advanceTimersByTime(450);

      expect(attempts).toBe(2); // exactly 1 retry (2 total attempts)
      expect(errorReceived).toBeDefined();
      expect((errorReceived as HttpErrorResponse).status).toBe(503);
    });

    it('never retries mutating requests (POST, PUT, PATCH, DELETE)', () => {
      const req = new HttpRequest('POST', '/api/v1/mutate', { amount: 100 });
      let attempts = 0;

      const next: HttpHandlerFn = () => {
        attempts++;
        return throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }));
      };

      let errorReceived: unknown;
      TestBed.runInInjectionContext(() => {
        retryInterceptor(req, next).subscribe({
          error: (err) => {
            errorReceived = err;
          },
        });
      });

      expect(attempts).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(attempts).toBe(1); // Never retried
      expect(errorReceived).toBeDefined();
    });

    it('does not retry 4xx client errors (e.g. 400 or 404)', () => {
      const req = new HttpRequest('GET', '/api/v1/missing');
      let attempts = 0;

      const next: HttpHandlerFn = () => {
        attempts++;
        return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' }));
      };

      TestBed.runInInjectionContext(() => {
        retryInterceptor(req, next).subscribe({
          error: () => {},
        });
      });

      expect(attempts).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(attempts).toBe(1);
    });
  });
});
