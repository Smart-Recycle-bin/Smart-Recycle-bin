import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authGuard, guestGuard, roleGuard } from './core/guards';
import { UserRole } from './core/models/user/user-role.enum';
import { AuthService } from './core/services/auth/auth.service';
import { TokenStorageService } from './core/services/auth/token-storage.service';
import { ToastService } from './core/services/toast/toast.service';
import { authInterceptor, errorInterceptor } from './core/interceptors';
import { mockBackendInterceptor } from './core/interceptors/mock-backend/engine/mock-backend.interceptor';
import { generateMockAccessToken } from './core/interceptors/mock-backend/engine/mock-auth';
import { resetMockDb } from './core/mock/db/mock-db';
import { environment } from '../environments/environment';

describe('App Routes', () => {
  let router: Router;
  let harness: RouterTestingHarness;
  let authService: AuthService;
  let tokenStorage: TokenStorageService;

  beforeAll(async () => {
    await Promise.all([
      import('./layouts/admin-layout/admin-layout'),
      import('./layouts/auth-layout/auth-layout'),
      import('./features/errors/not-found/not-found'),
    ]);
  }, 60000);

  beforeEach(async () => {
    localStorage.removeItem(environment.sessionStorageKey);
    resetMockDb();

    await TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([errorInterceptor, authInterceptor, mockBackendInterceptor])),
        AuthService,
        TokenStorageService,
        ToastService,
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    tokenStorage = TestBed.inject(TokenStorageService);

    // Seed active admin session by default so admin routes are reachable in basic render tests
    const validToken = generateMockAccessToken(
      { userId: 'ADM-001', role: UserRole.Admin, displayName: 'Sarah Connor' },
      3600
    );
    tokenStorage.saveSession({
      accessToken: validToken,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshToken: 'valid_refresh_token',
      user: {
        userId: 'ADM-001',
        displayName: 'Sarah Connor',
        role: UserRole.Admin,
      },
    });
    authService.restoreSession();

    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    localStorage.removeItem(environment.sessionStorageKey);
    resetMockDb();
  });

  describe('Route Configuration Declarations', () => {
    it('configures guestGuard on /login route', () => {
      const loginRoute = routes.find((r) => r.path === 'login');
      expect(loginRoute).toBeDefined();
      expect(loginRoute?.canActivate).toContain(guestGuard);
    });

    it('configures authGuard, roleGuard, and UserRole.Admin on admin shell route', () => {
      const adminShellRoute = routes.find((r) => r.path === '' && r.children !== undefined);
      expect(adminShellRoute).toBeDefined();
      expect(adminShellRoute?.canActivate).toContain(authGuard);
      expect(adminShellRoute?.canActivate).toContain(roleGuard);
      expect(adminShellRoute?.data?.['roles']).toEqual([UserRole.Admin]);
    });

    it('leaves dev/components and wildcard ** routes unguarded', () => {
      const devRoute = routes.find((r) => r.path === 'dev/components');
      expect(devRoute?.canActivate).toBeUndefined();

      const wildcardRoute = routes.find((r) => r.path === '**');
      expect(wildcardRoute?.canActivate).toBeUndefined();
    });
  });

  describe('Authenticated Admin Navigation', () => {
    it('should redirect empty path to /overview', async () => {
      await harness.navigateByUrl('/');
      expect(router.url).toBe('/overview');
      expect(harness.routeNativeElement?.textContent).toContain('Overview');
    }, 15000);

    it('should render lazy dev components showcase', async () => {
      await harness.navigateByUrl('/dev/components');
      expect(router.url).toBe('/dev/components');
      expect(harness.routeNativeElement?.textContent).toContain('EcoBin UI Kit & Foundation');
    }, 15000);

    it('should render admin feature routes', async () => {
      const adminPaths: [string, string][] = [
        ['/bins', 'Bins List'],
        ['/bins/map', 'Live Bin Map'],
        ['/recyclers', 'Recyclers'],
        ['/collectors', 'Collectors'],
        ['/wallet', 'Wallet & Ledger'],
        ['/review-queue', 'Reports'],
        ['/survey-qa', 'Survey QA'],
        ['/rewards', 'Rewards Catalog'],
        ['/leaderboards', 'Leaderboards & Badges'],
        ['/audit-logs', 'Audit Logs'],
      ];

      for (const [url, expectedTitle] of adminPaths) {
        await harness.navigateByUrl(url);
        expect(router.url).toBe(url);
        expect(harness.routeNativeElement?.textContent).toContain(expectedTitle);
      }
    }, 15000);

    it('should render NotFound on unknown routes', async () => {
      await harness.navigateByUrl('/non-existent-route');
      expect(harness.routeNativeElement?.textContent).toContain('Page not found');
    });
  });

  describe('Guards Integration (with Mock Backend)', () => {
    it('redirects to /login?returnUrl=%2Fbins when visiting /bins while logged out', async () => {
      authService.clearSession();

      await harness.navigateByUrl('/bins');
      expect(router.url).toBe('/login?returnUrl=%2Fbins');
      expect(harness.routeNativeElement?.textContent).toContain('Sign in');
    });

    it('redirects authenticated admin away from /login to /overview', async () => {
      await harness.navigateByUrl('/login');
      expect(router.url).toBe('/overview');
      expect(harness.routeNativeElement?.textContent).toContain('Overview');
    });

    it('renders /login placeholder when visiting /login while logged out', async () => {
      authService.clearSession();

      await harness.navigateByUrl('/login');
      expect(router.url).toBe('/login');
      expect(harness.routeNativeElement?.textContent).toContain('Sign in');
    });

    it('refreshes token and opens /bins when access token is expired but refresh token is valid', async () => {
      // 1. Login via mock backend to obtain genuine refresh token recorded in mockDb
      let loginSuccess = false;
      await new Promise<void>((resolve, reject) => {
        authService
          .login({ email: 'admin@ecobin.eg', password: 'password123' })
          .subscribe({
            next: () => {
              loginSuccess = true;
              resolve();
            },
            error: reject,
          });
      });
      expect(loginSuccess).toBe(true);

      // 2. Expire access token artificially in storage
      const session = tokenStorage.getSession();
      expect(session).not.toBeNull();
      if (session) {
        tokenStorage.saveSession({
          ...session,
          expiresAt: new Date(Date.now() - 60000).toISOString(), // expired 1m ago
        });
        authService.restoreSession();
      }

      expect(authService.isAuthenticated()).toBe(false);
      expect(authService.hasRefreshToken()).toBe(true);

      // 3. Navigate to /bins — authGuard must refresh and allow access
      await harness.navigateByUrl('/bins');
      expect(router.url).toBe('/bins');
      expect(harness.routeNativeElement?.textContent).toContain('Bins List');
      expect(authService.isAuthenticated()).toBe(true);
    });
  });
});
