import { test, expect } from '@playwright/test';
import {
  setupConsoleGuard,
  login,
  expectNoHorizontalOverflow,
} from './support';

const VIEWPORTS = [
  { name: 'mobile (390)', width: 390, height: 844 },
  { name: 'tablet (768)', width: 768, height: 1024 },
  { name: 'desktop (1024)', width: 1024, height: 768 },
  { name: 'wide desktop (1440)', width: 1440, height: 900 },
];

const ADMIN_ROUTES = [
  '/overview',
  '/bins',
  '/bins/map',
  '/recyclers',
  '/collectors',
  '/wallet',
  '/review-queue',
  '/review-queue/AIR-2048',
  '/survey-qa',
  '/rewards',
  '/leaderboards',
  '/audit-logs',
];

test.describe('Routes, Responsiveness & Layout Overflow', () => {
  test('public /login renders without console errors or horizontal overflow across viewports', async ({
    page,
  }) => {
    const guard = setupConsoleGuard(page);

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/login');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.locator('input[type="email"], input#email')).toBeVisible();
      await expectNoHorizontalOverflow(page);
    }

    guard.assertNoErrors();
  });

  test('unknown route renders not-found component without crashing', async ({ page }) => {
    const guard = setupConsoleGuard(page);
    await login(page);

    await page.goto('/this-route-does-not-exist');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('app-not-found')).toBeVisible({ timeout: 10000 });
    await expectNoHorizontalOverflow(page);

    guard.assertNoErrors();
  });

  for (const routePath of ADMIN_ROUTES) {
    test.describe(`Route: ${routePath}`, () => {
      for (const vp of VIEWPORTS) {
        test(`renders cleanly at ${vp.name}`, async ({ page }) => {
          const guard = setupConsoleGuard(page);
          await page.setViewportSize({ width: vp.width, height: vp.height });

          await login(page);
          await page.goto(routePath);
          await page.waitForLoadState('domcontentloaded');

          // Wait for content container or layout
          await expect(page.locator('app-admin-layout')).toBeVisible({ timeout: 10000 });

          await expectNoHorizontalOverflow(page);
          guard.assertNoErrors();
        });
      }
    });
  }
});
