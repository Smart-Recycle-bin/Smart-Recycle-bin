import { test, expect } from '@playwright/test';
import {
  setupConsoleGuard,
  setTheme,
  expectNoHorizontalOverflow,
  runAxe,
} from './support';

test.describe('Login Page Redesign & Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
  });

  const viewports = [
    { name: 'mobile (390px)', width: 390, height: 844 },
    { name: 'tablet (768px)', width: 768, height: 1024 },
    { name: 'desktop (1440px)', width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`renders without horizontal overflow on ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      await expectNoHorizontalOverflow(page);

      if (vp.width >= 1024) {
        // Desktop: Right brand panel is visible, compact mobile header is hidden
        await expect(page.locator('.auth-aside-panel')).toBeVisible();
        await expect(page.locator('.auth-compact-brand')).toBeHidden();
        await expect(page.locator('.glass-chip.chip-points')).toBeVisible();
        await expect(page.locator('.glass-chip.chip-bin')).toBeVisible();
      } else {
        // Mobile / Tablet: Right brand panel is hidden, compact mobile header is visible
        await expect(page.locator('.auth-aside-panel')).toBeHidden();
        await expect(page.locator('.auth-compact-brand')).toBeVisible();
      }
    });
  }

  test('supports light and dark themes without serious/critical a11y violations', async ({ page }) => {
    // 1. Light Theme
    await setTheme(page, 'light');
    await page.waitForTimeout(250);
    let violations = await runAxe(page);
    expect(violations).toEqual([]);

    // 2. Dark Theme
    await setTheme(page, 'dark');
    await page.waitForTimeout(250);
    violations = await runAxe(page);
    expect(violations).toEqual([]);
  });

  test('supports keyboard-only login navigation and submission', async ({ page }) => {
    const emailInput = page.locator('app-input[formcontrolname="email"] input, input[type="email"]');
    await emailInput.focus();
    await emailInput.fill('admin@ecobin.eg');

    // Tab to password input
    await page.keyboard.press('Tab');
    const passwordInput = page.locator('app-input[formcontrolname="password"] input');
    await expect(passwordInput).toBeFocused();
    await passwordInput.fill('password123');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Successfully navigates to /overview
    await page.waitForURL((url) => url.pathname.includes('/overview'), { timeout: 15000 });
    expect(page.url()).toContain('/overview');
  });

  test('toggles password visibility with aria-pressed attribute', async ({ page }) => {
    const passwordInput = page.locator('app-input[formcontrolname="password"] input');
    const toggleBtn = page.locator('app-input[formcontrolname="password"] button.input-icon-trailing-btn');

    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle button to reveal password
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide password
    await toggleBtn.click();
    await expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('auto-fills mock credentials from the mock chip button', async ({ page }) => {
    const fillBtn = page.locator('button.mock-fill-btn');
    await expect(fillBtn).toBeVisible({ timeout: 5000 });
    await fillBtn.click();

    const emailInput = page.locator('app-input[formcontrolname="email"] input, input[type="email"]');
    const passwordInput = page.locator('app-input[formcontrolname="password"] input');

    await expect(emailInput).toHaveValue('admin@ecobin.eg');
    await expect(passwordInput).toHaveValue('password123');
  });

  test('displays error alert banner on invalid credentials without horizontal shift', async ({ page }) => {
    const emailInput = page.locator('app-input[formcontrolname="email"] input, input[type="email"]');
    const passwordInput = page.locator('app-input[formcontrolname="password"] input');
    const submitBtn = page.locator('button[type="submit"]');

    await emailInput.fill('admin@ecobin.eg');
    await passwordInput.fill('wrongpass');
    await submitBtn.click();

    const banner = page.locator('.login-error-banner[role="alert"]');
    await expect(banner).toBeVisible({ timeout: 10000 });
    await expect(banner).toContainText('Invalid email or password');

    await expectNoHorizontalOverflow(page);
  });
});
