import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { roleGuard } from './role.guard';
import { AuthService } from '@services/auth/auth.service';
import { ToastService } from '@services/toast/toast.service';
import { UserRole } from '@models/user/user-role.enum';

describe('roleGuard', () => {
  let router: Router;
  let authServiceSpy: {
    role: ReturnType<typeof vi.fn>;
    clearSession: ReturnType<typeof vi.fn>;
  };
  let toastServiceSpy: {
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceSpy = {
      role: vi.fn(),
      clearSession: vi.fn(),
    };
    toastServiceSpy = {
      error: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
      ],
    });

    router = TestBed.inject(Router);
  });

  const runGuard = (data: Record<string, unknown> = {}): boolean | UrlTree => {
    const routeSnapshot = { data } as unknown as ActivatedRouteSnapshot;
    const stateSnapshot = {
      url: '/overview',
      root: {} as unknown as ActivatedRouteSnapshot,
    } as RouterStateSnapshot;
    return TestBed.runInInjectionContext(() => roleGuard(routeSnapshot, stateSnapshot)) as
      | boolean
      | UrlTree;
  };

  it('allows access when user has the required SYS_ADMIN role', () => {
    authServiceSpy.role.mockReturnValue(UserRole.Admin);

    const result = runGuard({ roles: [UserRole.Admin] });
    expect(result).toBe(true);
    expect(authServiceSpy.clearSession).not.toHaveBeenCalled();
    expect(toastServiceSpy.error).not.toHaveBeenCalled();
  });

  it('denies access, clears session, shows error toast, and redirects when user has unauthorized role', () => {
    authServiceSpy.role.mockReturnValue(UserRole.Citizen);

    const result = runGuard({ roles: [UserRole.Admin] });
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Administrators only');
  });

  it('denies access, clears session, shows error toast, and redirects when user has no role', () => {
    authServiceSpy.role.mockReturnValue(null);

    const result = runGuard({ roles: [UserRole.Admin] });
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Administrators only');
  });

  it('denies access when route.data is missing the roles property', () => {
    authServiceSpy.role.mockReturnValue(UserRole.Admin);

    const result = runGuard({});
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Administrators only');
  });

  it('denies access when route.data.roles is empty', () => {
    authServiceSpy.role.mockReturnValue(UserRole.Admin);

    const result = runGuard({ roles: [] });
    expect(result).toBeInstanceOf(UrlTree);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
    expect(authServiceSpy.clearSession).toHaveBeenCalled();
    expect(toastServiceSpy.error).toHaveBeenCalledWith('Administrators only');
  });
});
