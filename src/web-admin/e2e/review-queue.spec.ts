import { test, expect } from '@playwright/test';
import { setupConsoleGuard, login } from './support';

test.describe('Review Queue & Inspection Actions Flow', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
    await login(page);
  });

  test('counters and sidebar badge update after dismiss and retraining actions', async ({ page }) => {
    await page.goto('/review-queue');
    await page.waitForLoadState('networkidle');

    // 1. Initial State: Pending card shows 5, sidebar badge shows 5
    const sidebarBadge = page.locator('a[href="/review-queue"] .nav-count-pill');
    await expect(sidebarBadge).toHaveText('5');

    const pendingCount = page.locator('.summary-card.standard-card').first().locator('.metric-value');
    await expect(pendingCount).toHaveText('5');

    // 2. Click first row to view report detail (AIR-2048)
    const firstRow = page.locator('tbody tr.tr-row').first();
    await firstRow.click();
    await page.waitForURL('**/review-queue/AIR-2048');

    // 3. Action 1: Dismiss report
    const dismissBtn = page.locator('button:has-text("ML was correct / dismiss")');
    await expect(dismissBtn).toBeVisible();
    await dismissBtn.click();

    // Verify toast & badge drops to 4
    await expect(page.locator('app-toast, .toast-message, [role="alert"]').first()).toBeVisible();
    await expect(sidebarBadge).toHaveText('4', { timeout: 10000 });

    // 4. Return to review queue list
    await page.locator('a.back-link, a[href="/review-queue"]').first().click();
    await page.waitForURL('**/review-queue');
    await page.waitForLoadState('networkidle');

    // Verify Pending is 4, Reviewed is 4
    await expect(pendingCount).toHaveText('4');
    const reviewedCount = page.locator('.summary-card.standard-card').nth(1).locator('.metric-value');
    await expect(reviewedCount).toHaveText('4');

    // 5. Navigate to another pending report (AIR-2047)
    await page.locator('tbody tr.tr-row', { hasText: 'AIR-2047' }).click();
    await page.waitForURL('**/review-queue/AIR-2047');

    // 6. Action 2: Send to retraining
    const retrainBtn = page.locator('button:has-text("Send to retraining")');
    await expect(retrainBtn).toBeVisible();
    await retrainBtn.click();

    // Verify toast & badge drops to 3
    await expect(page.locator('app-toast, .toast-message, [role="alert"]').first()).toBeVisible();
    await expect(sidebarBadge).toHaveText('3', { timeout: 10000 });

    // 7. Return to review queue list
    await page.locator('a.back-link, a[href="/review-queue"]').first().click();
    await page.waitForURL('**/review-queue');
    await page.waitForLoadState('networkidle');

    // Verify Pending is 3, Reviewed is 5, and retraining dataset grew
    await expect(pendingCount).toHaveText('3');
    await expect(reviewedCount).toHaveText('5');
    const retrainMetric = page.locator('.retraining-card .metric-value');
    await expect(retrainMetric).toHaveText('1,286');
  });
});
