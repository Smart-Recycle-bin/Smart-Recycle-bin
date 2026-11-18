import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LoggerService,
  ERROR_REPORTER,
  ErrorReporter,
  LogEntry,
  sanitizeLogValue,
} from './logger.service';
import { GlobalErrorHandler, CHUNK_RELOAD_SESSION_KEY } from './global-error-handler';
import { ToastService } from '@services/toast/toast.service';
import { environment } from '@env/environment';

describe('LoggerService & GlobalErrorHandler', () => {
  let loggerService: LoggerService;
  let globalErrorHandler: GlobalErrorHandler;
  let mockReporter: ErrorReporter;
  let mockToastService: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let mockRouter: { url: string };

  beforeEach(() => {
    sessionStorage.clear();
    mockReporter = { report: vi.fn() };
    mockToastService = { info: vi.fn(), error: vi.fn() };
    mockRouter = { url: '/test-route' };

    TestBed.configureTestingModule({
      providers: [
        LoggerService,
        GlobalErrorHandler,
        { provide: Router, useValue: mockRouter },
        { provide: ERROR_REPORTER, useValue: mockReporter },
        { provide: ToastService, useValue: mockToastService },
      ],
    });

    loggerService = TestBed.inject(LoggerService);
    globalErrorHandler = TestBed.inject(GlobalErrorHandler);
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  describe('Sanitization & Security (Never leak tokens or secrets)', () => {
    it('redacts sensitive keys such as token, password, secret, authorization', () => {
      const rawContext = {
        username: 'admin',
        password: 'SuperSecretPassword123',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-IDcSemACt8x4iTMCda8Yhe3iZaWbvV5XKSTbuAn0M',
        headers: {
          authorization: 'Bearer secret_token_xyz',
          normalHeader: 'value',
        },
      };

      const sanitized = sanitizeLogValue(rawContext) as any;
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.accessToken).toBe('[REDACTED]');
      expect(sanitized.headers.authorization).toBe('[REDACTED]');
      expect(sanitized.headers.normalHeader).toBe('value');
      expect(sanitized.username).toBe('admin');
    });

    it('redacts Bearer tokens embedded in string messages', () => {
      const msg = 'Failed request with auth Bearer secret_12345_token on endpoint';
      const sanitized = sanitizeLogValue(msg);
      expect(sanitized).toBe('Failed request with auth [REDACTED] on endpoint');
      expect(sanitized).not.toContain('secret_12345_token');
    });

    it('reports error to ErrorReporter without leaking credentials', () => {
      loggerService.error('Auth error', new Error('Failed with password123'), {
        token: 'secret-token-abc',
        safeData: 42,
      });

      expect(mockReporter.report).toHaveBeenCalledTimes(1);
      const entry = (mockReporter.report as any).mock.calls[0][0] as LogEntry;

      expect(entry.level).toBe('error');
      expect(entry.route).toBe('/test-route');
      expect(entry.appVersion).toBe(environment.appVersion);
      expect(entry.context?.['token']).toBe('[REDACTED]');
      expect(entry.context?.['safeData']).toBe(42);
    });
  });

  describe('GlobalErrorHandler', () => {
    it('detects chunk load failure and triggers reload once with toast notification', () => {
      const originalReload = window.location.reload;
      const reloadMock = vi.fn();
      Object.defineProperty(window, 'location', {
        writable: true,
        value: { ...window.location, reload: reloadMock },
      });

      vi.useFakeTimers();

      const chunkError = new Error('Failed to fetch dynamically imported module: /chunk-123.js');
      globalErrorHandler.handleError(chunkError);

      expect(sessionStorage.getItem(CHUNK_RELOAD_SESSION_KEY)).toBe('true');
      expect(mockToastService.info).toHaveBeenCalledWith('A new version is available — reloading');

      vi.advanceTimersByTime(1100);
      expect(reloadMock).toHaveBeenCalledTimes(1);

      // Subsequent chunk error in same session must not trigger another reload loop
      reloadMock.mockClear();
      globalErrorHandler.handleError(chunkError);
      expect(reloadMock).not.toHaveBeenCalled();

      window.location.reload = originalReload;
      vi.useRealTimers();
    });

    it('delegates general errors to LoggerService and ErrorReporter', () => {
      const generalError = new Error('Database connection failed');
      globalErrorHandler.handleError(generalError);

      expect(mockReporter.report).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: expect.stringContaining('Database connection failed'),
        })
      );
    });
  });
});
