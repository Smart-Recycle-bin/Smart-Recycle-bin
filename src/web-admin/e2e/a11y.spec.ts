import { test } from '@playwright/test';
import {
  setupConsoleGuard,
  login,
  setTheme,
  runAxe,
  loadA11yBaseline,
  saveA11yBaseline,
  assertA11yBaseline,
  normalizeTargetSelector,
  A11yBaseline,
  A11yBaselineEntry,
} from './support';

const ROUTES_TO_AUDIT = [
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

const THEMES: Array<'light' | 'dark'> = ['light', 'dark'];

test.describe('Accessibility Audits (Axe WCAG AA)', () => {
  const isRecording = !!process.env['RECORD_BASELINES'] || !!process.env['UPDATE_BASELINES'];
  const baseline: A11yBaseline = loadA11yBaseline();
  const recordedBaseline: A11yBaseline = { ...baseline };

  test.afterAll(() => {
    if (isRecording) {
      saveA11yBaseline(recordedBaseline);
    }
  });

  for (const routePath of ROUTES_TO_AUDIT) {
    for (const theme of THEMES) {
      const scenarioKey = `${routePath}:${theme}`;

      test(`Axe audit on ${scenarioKey}`, async ({ page }, testInfo) => {
        setupConsoleGuard(page);

        if (routePath === '/login') {
          await page.goto('/login');
        } else {
          await login(page);
          await page.goto(routePath);
        }

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(400); // Allow render animations to settle
        await setTheme(page, theme);
        await page.waitForTimeout(200);

        const violations = await runAxe(page);

        if (isRecording) {
          const entries: A11yBaselineEntry[] = [];
          for (const v of violations) {
            if (!v.nodes || v.nodes.length === 0) {
              entries.push({ id: v.id, target: 'page' });
            } else {
              for (const node of v.nodes) {
                entries.push({ id: v.id, target: normalizeTargetSelector(node.target.join(' ')) });
              }
            }
          }
          recordedBaseline[scenarioKey] = entries;
        } else {
          assertA11yBaseline(scenarioKey, violations, baseline, testInfo.project.name);
        }
      });
    }
  }

  // Audits on open overlays
  test('Axe audit on open register-bin drawer', async ({ page }, testInfo) => {
    setupConsoleGuard(page);
    await login(page);
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    const btn = page.locator('button:has-text("Register bin")').first();
    if (await btn.isVisible()) {
      await btn.click();
      const drawer = page.locator('app-drawer').first();
      await drawer.waitFor({ state: 'visible', timeout: 5000 });

      const scenarioKey = '/bins:drawer:light';
      const violations = await runAxe(page, { include: 'app-drawer' });

      if (isRecording) {
        recordedBaseline[scenarioKey] = violations.flatMap((v) =>
          v.nodes.map((n) => ({ id: v.id, target: normalizeTargetSelector(n.target.join(' ')) }))
        );
      } else {
        assertA11yBaseline(scenarioKey, violations, baseline, testInfo.project.name);
      }
    }
  });

  test('Axe audit on notifications panel', async ({ page }, testInfo) => {
    setupConsoleGuard(page);
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const notifBtn = page.locator('button.notif-btn, button[aria-label="View notifications"]').first();
    if (await notifBtn.isVisible()) {
      await notifBtn.click();
      const panel = page.locator('app-notifications-panel').first();
      await panel.waitFor({ state: 'visible', timeout: 5000 });
      const scenarioKey = '/overview:notifications:light';
      const violations = await runAxe(page, { include: 'app-notifications-panel' });

      if (isRecording) {
        recordedBaseline[scenarioKey] = violations.flatMap((v) =>
          v.nodes.map((n) => ({ id: v.id, target: normalizeTargetSelector(n.target.join(' ')) }))
        );
      } else {
        assertA11yBaseline(scenarioKey, violations, baseline, testInfo.project.name);
      }
    }
  });

  test('Axe audit on user menu dropdown', async ({ page }, testInfo) => {
    setupConsoleGuard(page);
    await login(page);
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const userMenuBtn = page.locator('button.user-trigger-btn, button[aria-label="User menu"]').first();
    if (await userMenuBtn.isVisible()) {
      await userMenuBtn.click();
      const scenarioKey = '/overview:user-menu:light';
      const violations = await runAxe(page, { include: 'app-dropdown-menu' });

      if (isRecording) {
        recordedBaseline[scenarioKey] = violations.flatMap((v) =>
          v.nodes.map((n) => ({ id: v.id, target: normalizeTargetSelector(n.target.join(' ')) }))
        );
      } else {
        assertA11yBaseline(scenarioKey, violations, baseline, testInfo.project.name);
      }
    }
  });
});
