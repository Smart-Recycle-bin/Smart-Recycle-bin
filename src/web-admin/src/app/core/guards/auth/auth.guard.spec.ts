import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { of, throwError, Subject, firstValueFrom, isObservable } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '@services/auth/auth.service';

describe('authGuard', () => {
  let router: Router;
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
    hasRefreshToken: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };

  const createMockSnapshot = (url: string): RouterStateSnapshot => ({
    url,
    root: {} as unknown as ActivatedRouteSnapshot,
  });

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
      hasRefreshToken: vi.fn(),
      refresh: vi.fn(),
      clearSession: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  const runGuard = async (url: string): Promise<boolean | UrlTree> => {
    const routeSnapshot = {} as ActivatedRouteSnapshot;
    const stateSnapshot = createMockSnapshot(url);
    const result = TestBed.runInInjectionContext(() => authGuard(routeSnapshot, stateSnapshot));

    if (isObservable(result)) {
      return (await firstValueFrom(result)) as boolean | UrlTree;
    }
    return result as boolean | UrlTree;
  };

  it('allows navigation when user is authenticated', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);

    const result = await runGuard('/overview');
    expect(result).toBe(true);
    expect(authServiceSpy.refresh).not.toHaveBeenCalled();
  });

  it('redirects to /login with returnUrl when no session exists', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(false);

    const result = await runGuard('/bins/map');
    expect(result).toBeInstanceOf(UrlTree);
    const targetUrl = router.serializeUrl(result as UrlTree);
    expect(targetUrl).toBe('/login?returnUrl=%2Fbins%2Fmap');
  });

  it('does NOT attach returnUrl when navigating to root (/)', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(false);

    const result = await runGuard('/');
    expect(result).toBeInstanceOf(UrlTree);
    const targetUrl = router.serializeUrl(result as UrlTree);
    expect(targetUrl).toBe('/login');
  });

  it('does NOT attach returnUrl when already navigating to /login', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(false);

    const result = await runGuard('/login');
    expect(result).toBeInstanceOf(UrlTree);
    const targetUrl = router.serializeUrl(result as UrlTree);
    expect(targetUrl).toBe('/login');
  });

  it('attempts token refresh when access token is expired but refresh token exists', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(true);
    authServiceSpy.refresh.mockReturnValue(of(undefined));

    const result = await runGuard('/collectors');
    expect(authServiceSpy.refresh).toHaveBeenCalledTimes(1);
    expect(result).toBe(true);
  });

  it('redirects to /login?returnUrl=... when token refresh fails', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(true);
    authServiceSpy.refresh.mockReturnValue(throwError(() => new Error('Refresh failed')));

    const result = await runGuard('/wallet');
    expect(authServiceSpy.refresh).toHaveBeenCalledTimes(1);
    expect(result).toBeInstanceOf(UrlTree);
    const targetUrl = router.serializeUrl(result as UrlTree);
    expect(targetUrl).toBe('/login?returnUrl=%2Fwallet');
  });

  it('redirects but does NOT clear session when refresh fails due to network error', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(true);
    const networkError = { status: 0, message: 'Network offline' };
    authServiceSpy.refresh.mockReturnValue(throwError(() => networkError));

    const result = await runGuard('/bins');
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?returnUrl=%2Fbins');
    // authGuard itself does not invoke clearSession; AuthService preserves session on status 0
    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
  });

  it('delegates to AuthService.refresh across simultaneous guard evaluations', async () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);
    authServiceSpy.hasRefreshToken.mockReturnValue(true);

    const refreshSubject = new Subject<void>();
    authServiceSpy.refresh.mockReturnValue(refreshSubject.asObservable());

    const nav1Promise = runGuard('/bins');
    const nav2Promise = runGuard('/collectors');

    expect(authServiceSpy.refresh).toHaveBeenCalled();

    refreshSubject.next();
    refreshSubject.complete();

    const [res1, res2] = await Promise.all([nav1Promise, nav2Promise]);
    expect(res1).toBe(true);
    expect(res2).toBe(true);
  });
});
