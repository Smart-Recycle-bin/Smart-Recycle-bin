import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { guestGuard } from './guest.guard';
import { AuthService } from '@services/auth/auth.service';

describe('guestGuard', () => {
  let router: Router;
  let authServiceSpy: {
    isAuthenticated: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceSpy = {
      isAuthenticated: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  const runGuard = (): boolean | UrlTree => {
    const routeSnapshot = {} as ActivatedRouteSnapshot;
    const stateSnapshot = {
      url: '/login',
      root: {} as unknown as ActivatedRouteSnapshot,
    } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => guestGuard(routeSnapshot, stateSnapshot)) as
      | boolean
      | UrlTree;
  };

  it('allows access when user is anonymous / not authenticated', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(false);

    const result = runGuard();
    expect(result).toBe(true);
  });

  it('redirects to the default admin landing route (/overview) when user is authenticated', () => {
    authServiceSpy.isAuthenticated.mockReturnValue(true);

    const result = runGuard();
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/overview');
  });
});
