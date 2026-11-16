import { test, expect } from '@playwright/test';
import { setupConsoleGuard, login } from './support';

test.describe('Paged Lists Infrastructure & Interactions', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
    await login(page);
  });

  test('search input debounces rapid keystrokes to a single backend request via window.__mockCalls', async ({
    page,
  }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    // Verify window.__mockCalls is exposed in e2e configuration
    const initialCalls = await page.evaluate(
      () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
    );
    expect(typeof initialCalls).toBe('number');

    const searchInput = page.locator(
      'main app-search-input input, .filters-card app-search-input input'
    );
    await expect(searchInput).toBeVisible();

    // Type rapidly: "Dokki" (5 keystrokes)
    await searchInput.pressSequentially('Dokki', { delay: 50 });

    // Wait past debounce threshold (300ms + 50ms mock latency)
    await page.waitForTimeout(600);

    const callsAfter = await page.evaluate(
      () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
    );

    // Should have made exactly 1 request for the search query
    expect(callsAfter - initialCalls).toBe(1);
  });

  test('navigates pagination and updates table rows and counter label', async ({ page }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    // Verify initial page indicator
    const pageIndicator = page.locator('app-pagination .page-indicator');
    await expect(pageIndicator).toContainText('Page 1');

    // Click Next page button
    const nextBtn = page.locator('app-pagination button[aria-label="Next page"]');
    await expect(nextBtn).toBeEnabled();
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(300);

    await expect(pageIndicator).toContainText('Page 2');
  });

  test('sorts table when clicking sortable column headers', async ({ page }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    const sortableHeader = page.locator('th button, th.data-table__th--sortable, th[data-sortable="true"]').first();
    if (await sortableHeader.isVisible()) {
      const initialCallCount = await page.evaluate(
        () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
      );

      await sortableHeader.click();
      await page.waitForLoadState('networkidle');

      const afterCallCount = await page.evaluate(
        () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
      );
      expect(afterCallCount).toBeGreaterThan(initialCallCount);
    }
  });

  test('applies select dropdown filter and updates dataset', async ({ page }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    const initialCallCount = await page.evaluate(
      () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
    );

    // Look for status or district filter
    const filterEl = page.locator('app-select, select, [data-testid="status-filter"]').first();
    if (await filterEl.isVisible()) {
      await filterEl.click();
      const option = page.locator('[role="option"], option').nth(1);
      if (await option.isVisible()) {
        await option.click();
        await page.waitForLoadState('networkidle');

        const afterCallCount = await page.evaluate(
          () => (window as unknown as { __mockCalls?: number }).__mockCalls ?? 0
        );
        expect(afterCallCount).toBeGreaterThan(initialCallCount);
      }
    }
  });

  test('displays empty state when search matches no records', async ({ page }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator(
      'main app-search-input input, .filters-card app-search-input input'
    );
    await searchInput.fill('ZZZNONEXISTENTSEARCHTERM12345');
    await page.waitForTimeout(600);

    await expect(page.locator('app-empty-state').first()).toBeVisible({ timeout: 5000 });
  });
});
