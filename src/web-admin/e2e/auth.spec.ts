import { test, expect } from '@playwright/test';
import { setupConsoleGuard, login, seedAuthenticatedSession } from './support';

test.describe('Authentication & Session Guarding', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
  });

  test('validates required fields and invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Field validation hints appear
    const emailInput = page.locator('input[type="email"], input#email');
    const passwordInput = page.locator('input[type="password"], input#password');

    await emailInput.fill('not-an-email');
    await passwordInput.fill('short');
    await submitBtn.click();

    await expect(page.locator('.form-field__error, .form-error, [role="alert"]').first()).toBeVisible({
      timeout: 5000,
    });
  });

  test('shows error banner on wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"], input#email').fill('admin@ecobin.eg');
    await page.locator('input[type="password"], input#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('.login-error-banner, [role="alert"]')).toBeVisible({
      timeout: 10000,
    });
    expect(page.url()).toContain('/login');
  });

  test('logs in successfully and redirects to overview', async ({ page }) => {
    await login(page);
    expect(page.url()).toContain('/overview');

    const sessionRaw = await page.evaluate(() => localStorage.getItem('ecobin_admin_session'));
    expect(sessionRaw).toBeTruthy();
    const session = JSON.parse(sessionRaw!);
    expect(session.user.role).toBe('SYS_ADMIN');
  });

  test('logout clears session storage and redirects to login', async ({ page }) => {
    await login(page);

    // Open topbar user menu
    const userMenuBtn = page.locator('button.user-trigger-btn, button[aria-label="User menu"]');
    await userMenuBtn.click();

    // Click Sign out
    const signOutBtn = page.locator('button:has-text("Sign out"), [role="menuitem"]:has-text("Sign out")');
    await signOutBtn.click();

    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });

    const sessionRaw = await page.evaluate(() => localStorage.getItem('ecobin_admin_session'));
    expect(sessionRaw).toBeNull();
  });

  test('back button after logout does not restore protected session', async ({ page }) => {
    await login(page);

    // Open user menu and log out
    const userMenuBtn = page.locator('button.user-trigger-btn, button[aria-label="User menu"]');
    await userMenuBtn.click();
    const signOutBtn = page.locator('button:has-text("Sign out"), [role="menuitem"]:has-text("Sign out")');
    await signOutBtn.click();
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });

    // Try going back
    await page.goBack();
    await page.waitForTimeout(1000);

    // Guard redirects back to login
    expect(page.url()).toContain('/login');
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('supports returnUrl parameter on login', async ({ page }) => {
    await page.goto('/login?returnUrl=%2Fbins');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[type="email"], input#email').fill('admin@ecobin.eg');
    await page.locator('input[type="password"], input#password').fill('password123');
    await page.locator('button[type="submit"]').click();

    await page.waitForURL((url) => url.pathname.includes('/bins'), { timeout: 15000 });
    expect(page.url()).toContain('/bins');
  });

  test('sanitizes open-redirect payloads and falls back to default route', async ({ page }) => {
    const maliciousPayloads = [
      '//evil.com',
      'https://evil.com',
      '/\\evil.com',
      'javascript:alert(1)',
    ];

    for (const payload of maliciousPayloads) {
      await page.goto(`/login?returnUrl=${encodeURIComponent(payload)}`);
      await page.waitForLoadState('domcontentloaded');

      await page.locator('input[type="email"], input#email').fill('admin@ecobin.eg');
      await page.locator('input[type="password"], input#password').fill('password123');
      await page.locator('button[type="submit"]').click();

      await page.waitForURL((url) => url.pathname.includes('/overview'), { timeout: 15000 });
      expect(page.url()).not.toContain('evil.com');
      expect(page.url()).toContain('/overview');

      // Clear session before next iteration
      await page.evaluate(() => localStorage.clear());
    }
  });

  test('handles corrupt storage JSON gracefully without crashing', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('ecobin_admin_session', '{not-valid-json!!}');
    });

    await page.goto('/overview');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('rejects tampered non-admin role and redirects to login', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'ecobin_admin_session',
        JSON.stringify({
          accessToken: 'fake_tampered_token',
          expiresIn: 900,
          user: {
            userId: 'U-999',
            displayName: 'Tampered Citizen',
            role: 'USER_CITIZEN',
          },
        })
      );
    });

    await page.goto('/overview');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('redirects on forged token when server rejects authentication', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'ecobin_admin_session',
        JSON.stringify({
          accessToken: 'forged.invalid.jwt.token',
          expiresIn: 900,
          user: {
            userId: 'ADM-001',
            displayName: 'Laila Hamdy',
            role: 'SYS_ADMIN',
          },
        })
      );
    });

    await page.goto('/overview');
    await page.waitForURL((url) => url.pathname.includes('/login'), { timeout: 10000 });
    expect(page.url()).toContain('/login');
  });

  test('rotates refresh token after 8s TTL across multiple navigations', async ({ page }) => {
    // 1. Log in (TTL is 8s in e2e environment)
    await login(page);
    expect(page.url()).toContain('/overview');

    const initialSessionRaw = await page.evaluate(() =>
      localStorage.getItem('ecobin_admin_session')
    );
    expect(initialSessionRaw).toBeTruthy();
    const initialSession = JSON.parse(initialSessionRaw!);
    const firstRefreshToken = initialSession.refreshToken;

    // 2. Wait 8.5s for the initial access token to expire
    await page.waitForTimeout(8500);

    // 3. Client-side Navigation 1: Click Bins link in sidebar
    await page.locator('app-sidebar a[href$="bins"], a[href$="/bins"]').first().click();
    await page.waitForURL((url) => url.pathname.includes('/bins'), { timeout: 10000 });
    expect(page.url()).toContain('/bins');

    // 4. Client-side Navigation 2: Click Collectors link in sidebar
    await page.locator('app-sidebar a[href$="collectors"], a[href$="/collectors"]').first().click();
    await page.waitForURL((url) => url.pathname.includes('/collectors'), { timeout: 10000 });
    expect(page.url()).toContain('/collectors');

    // 5. Client-side Navigation 3: Click Wallet link in sidebar
    await page.locator('app-sidebar a[href$="wallet"], a[href$="/wallet"]').first().click();
    await page.waitForURL((url) => url.pathname.includes('/wallet'), { timeout: 10000 });
    expect(page.url()).toContain('/wallet');

    // Verify session is still valid and tokens were refreshed
    const currentSessionRaw = await page.evaluate(() =>
      localStorage.getItem('ecobin_admin_session')
    );
    expect(currentSessionRaw).toBeTruthy();
    const currentSession = JSON.parse(currentSessionRaw!);
    expect(currentSession.user.role).toBe('SYS_ADMIN');
    // Token rotation occurred
    expect(currentSession.refreshToken).not.toBe(firstRefreshToken);
  });
});
