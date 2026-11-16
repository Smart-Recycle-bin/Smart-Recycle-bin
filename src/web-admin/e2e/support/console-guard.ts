import { Page, expect } from '@playwright/test';

export interface ConsoleGuard {
  getErrors(): string[];
  assertNoErrors(): void;
  clear(): void;
}

/**
 * Attaches listeners to the page to catch any console.error or uncaught page errors.
 * Fails the test if any error is encountered.
 */
export function setupConsoleGuard(page: Page): ConsoleGuard {
  const errors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`[console.error] ${msg.text()}`);
    }
  });

  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}\n${err.stack ?? ''}`);
  });

  return {
    getErrors: () => [...errors],
    assertNoErrors: () => {
      if (errors.length > 0) {
        expect(
          errors,
          `Expected 0 console errors or page exceptions, but found:\n${errors.join(
            '\n'
          )}`
        ).toEqual([]);
      }
    },
    clear: () => {
      errors.length = 0;
    },
  };
}
