import * as path from 'path';
import { defineConfig, devices } from '@playwright/test';

// Direct browser binaries to workspace drive to prevent C: drive ENOSPC
process.env['PLAYWRIGHT_BROWSERS_PATH'] =
  process.env['PLAYWRIGHT_BROWSERS_PATH'] ||
  path.resolve(__dirname, '.playwright-browsers');

/**
 * Playwright E2E and accessibility test harness configuration.
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : 2,
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: process.env['BASE_URL'] || 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],

  webServer: {
    command: 'npx ng serve --configuration e2e --port 4200',
    url: 'http://localhost:4200',
    reuseExistingServer: !process.env['CI'],
    timeout: 120 * 1000,
  },
});
