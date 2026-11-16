import { test } from '@playwright/test';
import {
  setupConsoleGuard,
  login,
  setTheme,
  lightSurfaces,
  loadDarkAllowlist,
  saveDarkAllowlist,
  assertDarkAllowlist,
  DarkAllowlist,
} from './support';

const ROUTES_TO_CHECK = [
  '/login',
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

test.describe('Dark Mode Theme & Unthemed Surfaces Audit', () => {
  const isRecording = !!process.env['RECORD_BASELINES'] || !!process.env['UPDATE_BASELINES'];
  const allowlist: DarkAllowlist = loadDarkAllowlist();
  const recordedAllowlist: DarkAllowlist = { ...allowlist };

  test.afterAll(() => {
    if (isRecording) {
      saveDarkAllowlist(recordedAllowlist);
    }
  });

  for (const routePath of ROUTES_TO_CHECK) {
    test(`dark mode surfaces on ${routePath}`, async ({ page }, testInfo) => {
      setupConsoleGuard(page);

      if (routePath === '/login') {
        await page.goto('/login');
      } else {
        await login(page);
        await page.goto(routePath);
      }

      await page.waitForLoadState('networkidle');
      await setTheme(page, 'dark');
      await page.waitForTimeout(400);

      const surfaces = await lightSurfaces(page);

      if (isRecording) {
        recordedAllowlist[routePath] = Array.from(new Set(surfaces.map((s) => s.selector)));
      } else {
        assertDarkAllowlist(routePath, surfaces, allowlist, testInfo.project.name);
      }
    });
  }

  test('dark mode surfaces in open drawer overlay', async ({ page }, testInfo) => {
    setupConsoleGuard(page);
    await login(page);
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'dark');

    const btn = page.locator('button:has-text("Register bin")').first();
    if (await btn.isVisible()) {
      await btn.click();
      const drawer = page.locator('app-drawer').first();
      await drawer.waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(400);

      const surfaces = await lightSurfaces(page);
      const scenarioKey = '/bins:drawer';

      if (isRecording) {
        recordedAllowlist[scenarioKey] = Array.from(new Set(surfaces.map((s) => s.selector)));
      } else {
        assertDarkAllowlist(scenarioKey, surfaces, allowlist, testInfo.project.name);
      }
    }
  });

  test('dark mode surfaces in notifications panel overlay', async ({ page }, testInfo) => {
    setupConsoleGuard(page);
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');
    await setTheme(page, 'dark');

    const notifBtn = page.locator('button.notif-btn, button[aria-label="View notifications"]').first();
    if (await notifBtn.isVisible()) {
      await notifBtn.click();
      const panel = page.locator('app-notifications-panel').first();
      await panel.waitFor({ state: 'visible', timeout: 5000 });
      await page.waitForTimeout(300);
      const surfaces = await lightSurfaces(page);
      const scenarioKey = '/overview:notifications';

      if (isRecording) {
        recordedAllowlist[scenarioKey] = Array.from(new Set(surfaces.map((s) => s.selector)));
      } else {
        assertDarkAllowlist(scenarioKey, surfaces, allowlist, testInfo.project.name);
      }
    }
  });
});
