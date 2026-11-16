import { Page, expect } from '@playwright/test';

/**
 * Asserts that the document has no horizontal overflow:
 * documentElement.scrollWidth <= documentElement.clientWidth.
 */
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const check = await page.evaluate(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = docEl.clientWidth;
    const hasOverflow = scrollWidth > clientWidth;

    let offendingElement: string | null = null;
    if (hasOverflow) {
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.right > clientWidth + 1) {
          const id = el.id ? `#${el.id}` : '';
          const cls =
            typeof el.className === 'string' && el.className.trim()
              ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
              : '';
          offendingElement = `${el.tagName.toLowerCase()}${id}${cls} (right: ${Math.round(
            rect.right
          )}px, clientWidth: ${clientWidth}px)`;
          break;
        }
      }
    }

    return {
      hasOverflow,
      scrollWidth,
      clientWidth,
      offendingElement,
    };
  });

  expect(
    check.hasOverflow,
    `Horizontal overflow detected! scrollWidth (${check.scrollWidth}px) exceeds clientWidth (${check.clientWidth}px). First offending element: ${check.offendingElement}`
  ).toBe(false);
}
