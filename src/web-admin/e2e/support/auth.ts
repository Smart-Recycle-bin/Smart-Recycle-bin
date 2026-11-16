import { Page, expect } from '@playwright/test';

export interface LoginOptions {
  email?: string;
  password?: string;
  expectRedirectUrl?: string;
}

/**
 * Logs in as an administrator using the seeded mock credentials.
 */
export async function login(
  page: Page,
  options: LoginOptions = {}
): Promise<void> {
  const email = options.email ?? 'admin@ecobin.eg';
  const password = options.password ?? 'password123';
  const expectedUrl = options.expectRedirectUrl ?? '/overview';

  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  const emailInput = page.locator('input[type="email"], input#email');
  const passwordInput = page.locator('input[type="password"], input#password');
  const submitButton = page.locator('button[type="submit"]');

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  await page.waitForURL((url) => url.pathname.includes(expectedUrl), {
    timeout: 15000,
  });
  await expect(page.locator('app-admin-layout, .admin-layout')).toBeVisible({
    timeout: 10000,
  });
}

/**
 * Programmatically injects a valid admin session into localStorage.
 */
export async function seedAuthenticatedSession(
  page: Page,
  sessionData?: Record<string, unknown>
): Promise<void> {
  const defaultSession = {
    accessToken: 'mock_jwt_token_admin_session',
    expiresIn: 8,
    refreshToken: 'mock_refresh_token_admin_session',
    user: {
      userId: 'ADM-001',
      displayName: 'Laila Hamdy',
      role: 'SYS_ADMIN',
    },
  };

  const payload = sessionData ?? defaultSession;

  await page.addInitScript((data) => {
    localStorage.setItem('ecobin_admin_session', JSON.stringify(data));
  }, payload);
}
