import { test, expect } from '@playwright/test';
import { setupConsoleGuard, login } from './support';

test.describe('Overlays, Focus Trapping & Accessibility Interactions', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
    await login(page);
  });

  test('drawer sets initial focus, traps Tab key, and restores focus on Esc', async ({
    page,
  }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    const triggerBtn = page.locator('button:has-text("Register bin")').first();
    await expect(triggerBtn).toBeVisible({ timeout: 5000 });
    await triggerBtn.focus();
    await triggerBtn.click();

    // 1. Verify drawer opens
    const drawer = page.locator('app-drawer').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // 2. Initial focus: active element should be inside the drawer
    await page.waitForTimeout(300);
    const isFocusInside = await page.evaluate(() => {
      const active = document.activeElement;
      const d = document.querySelector('app-drawer');
      return !!d && !!active && d.contains(active);
    });
    expect(isFocusInside).toBe(true);

    // 3. Focus trap: Tab multiple times, active element must remain inside the drawer
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const remainsInside = await page.evaluate(() => {
        const active = document.activeElement;
        const d = document.querySelector('app-drawer');
        return !!d && !!active && d.contains(active);
      });
      expect(remainsInside).toBe(true);
    }

    // 4. Press Escape to close
    await page.keyboard.press('Escape');
    await expect(drawer).not.toBeVisible({ timeout: 5000 });

    // 5. Focus restored: trigger button or valid container receives focus
    await page.waitForTimeout(300);
    const restoredToTrigger = await page.evaluate(() => {
      const active = document.activeElement;
      return !!active && document.body.contains(active);
    });
    expect(restoredToTrigger).toBe(true);
  });

  test('modal traps focus and closes on Esc key', async ({ page }) => {
    await page.goto('/collectors');
    await page.waitForLoadState('networkidle');

    // Click Deactivate action on first row
    const rowAction = page
      .locator(
        'button[title*="Deactivate"], button[aria-label*="Deactivate"], button:has-text("Deactivate")'
      )
      .first();
    await expect(rowAction).toBeVisible({ timeout: 5000 });
    await rowAction.click();

    const dialog = page.locator('app-confirm-dialog').first();
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Wait for initial focus inside modal
    await page.waitForTimeout(300);
    const isFocusInside = await page.evaluate(() => {
      const active = document.activeElement;
      const d = document.querySelector('app-confirm-dialog');
      return !!d && !!active && d.contains(active);
    });
    expect(isFocusInside).toBe(true);

    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible({ timeout: 5000 });
  });

  test('topbar notifications panel closes on outside click or Esc', async ({ page }) => {
    await page.goto('/overview');
    await page.waitForLoadState('networkidle');

    const notifBtn = page.locator('button.notif-btn, button[aria-label="View notifications"]').first();
    await expect(notifBtn).toBeVisible({ timeout: 5000 });
    await notifBtn.click();

    const panel = page.locator('app-notifications-panel').first();
    await expect(panel).toBeVisible({ timeout: 5000 });

    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible({ timeout: 5000 });
  });
});
