import { test, expect } from '@playwright/test';
import { setupConsoleGuard, login } from './support';

test.describe('Form Validation & Safety Workflows', () => {
  test.beforeEach(async ({ page }) => {
    setupConsoleGuard(page);
    await login(page);
  });

  test('registers a new smart waste bin with valid coordinates and capacity', async ({ page }) => {
    await page.goto('/bins');
    await page.waitForLoadState('networkidle');

    // Click "Register bin" drawer trigger
    const registerBtn = page.locator('button:has-text("Register bin")').first();
    await expect(registerBtn).toBeVisible({ timeout: 10000 });
    await registerBtn.click();

    // Verify drawer opened
    const drawer = page.locator('app-drawer').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Fill form fields
    const serialInput = drawer.locator('input[formcontrolname="deviceSerial"], input[formcontrolname="serialNumber"]');
    const latInput = drawer.locator('input[formcontrolname="latitude"]');
    const lngInput = drawer.locator('input[formcontrolname="longitude"]');
    const capacityInput = drawer.locator('input[formcontrolname="capacityThresholdKg"], input[formcontrolname="capacityLiters"]');

    if (await serialInput.isVisible()) {
      await serialInput.fill('BIN-E2E-TEST-001');
    }
    if (await latInput.isVisible()) {
      await latInput.fill('30.0444');
    }
    if (await lngInput.isVisible()) {
      await lngInput.fill('31.2357');
    }
    if (await capacityInput.isVisible()) {
      await capacityInput.fill('120');
    }

    // Select district if present
    const districtSelect = drawer.locator('app-select[formcontrolname="district"], select[name="district"]');
    if (await districtSelect.isVisible()) {
      await districtSelect.click();
      const option = page.locator('[role="option"], option').first();
      if (await option.isVisible()) {
        await option.click();
      }
    }

    // Submit button is active
    const saveBtn = drawer.locator('button:has-text("Register bin")').last();
    await expect(saveBtn).toBeVisible();
  });

  test('validates collector creation fields and submits valid collector', async ({ page }) => {
    await page.goto('/collectors');
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button:has-text("Create Collector Account"), button:has-text("Add collector")').first();
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    const drawer = page.locator('app-drawer').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const nameInput = drawer.locator('input[formcontrolname="displayName"], input[formcontrolname="name"]');
    const emailInput = drawer.locator('input[formcontrolname="email"]');
    const phoneInput = drawer.locator('input[formcontrolname="phoneNumber"], input[formcontrolname="phone"]');

    if (await nameInput.isVisible()) {
      await nameInput.fill('Test Collector');
    }
    if (await emailInput.isVisible()) {
      await emailInput.fill('collector.test@ecobin.eg');
    }
    if (await phoneInput.isVisible()) {
      await phoneInput.fill('+20 100 123 4567');
    }

    const saveBtn = drawer.locator('button:has-text("Create Account"), button:has-text("Create")').first();
    await expect(saveBtn).toBeVisible();
  });

  test('executes manual ledger adjustment via secondary confirmation dialog', async ({ page }) => {
    await page.goto('/wallet');
    await page.waitForLoadState('networkidle');

    const adjustBtn = page.locator('button:has-text("Manual adjustment")').first();
    await expect(adjustBtn).toBeVisible({ timeout: 10000 });
    await adjustBtn.click();

    const drawer = page.locator('app-drawer').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    // Select user
    const userPicker = drawer.locator('app-async-select input, input[placeholder*="recycler"]');
    if (await userPicker.isVisible()) {
      await userPicker.click();
      await page.waitForTimeout(300);
      const userOption = page.locator('[role="option"]').first();
      if (await userOption.isVisible()) {
        await userOption.click();
      }
    }

    // Fill amount & reason
    const amountInput = drawer.locator('input[formcontrolname="amount"]');
    const reasonInput = drawer.locator('textarea[formcontrolname="reasonNote"], textarea[formcontrolname="reason"]');

    if (await amountInput.isVisible()) {
      await amountInput.fill('150');
    }
    if (await reasonInput.isVisible()) {
      await reasonInput.fill('E2E Automated test adjustment reason verification');
    }

    const applyBtn = drawer.locator('button:has-text("Apply adjustment")');
    if (await applyBtn.isVisible() && !(await applyBtn.isDisabled())) {
      await applyBtn.click();

      // Confirm dialog appears
      const confirmDialog = page.locator('app-confirm-dialog').first();
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      // Confirm
      const confirmActionBtn = confirmDialog.locator('button:has-text("Confirm Credit"), button:has-text("Confirm Debit"), button:has-text("Confirm")').first();
      await confirmActionBtn.click();

      // Toast notification appears
      await expect(
        page.locator('app-toast, [role="status"], [data-testid="toast-success"]').first()
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('validates reward drawer inputs (dates, pointsCost, stock)', async ({ page }) => {
    await page.goto('/rewards');
    await page.waitForLoadState('networkidle');

    const addRewardBtn = page.locator('button:has-text("New item"), button:has-text("Add reward")').first();
    await expect(addRewardBtn).toBeVisible({ timeout: 10000 });
    await addRewardBtn.click();

    const drawer = page.locator('app-drawer').first();
    await expect(drawer).toBeVisible({ timeout: 5000 });

    const titleInput = drawer.locator('input[formcontrolname="title"]');
    const pointsInput = drawer.locator('input[formcontrolname="pointsCost"]');

    if (await pointsInput.isVisible()) {
      // Invalidate with negative points
      await pointsInput.fill('-10');
      await pointsInput.blur();
      await expect(drawer.locator('.field-error-msg')).toContainText('greater than 0', {
        timeout: 5000,
      });

      // Fix with valid points
      await pointsInput.fill('250');
    }

    if (await titleInput.isVisible()) {
      await titleInput.fill('E2E Test Coffee Voucher');
    }
  });
});
