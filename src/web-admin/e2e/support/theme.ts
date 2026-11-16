import { Page } from '@playwright/test';

export interface LightSurfaceInfo {
  selector: string;
  tagName: string;
  area: number;
  backgroundColor: string;
  luminance: number;
}

/**
 * Sets application theme ('light' | 'dark') through localStorage key 'app-theme-preference'
 * and updates documentElement classes.
 */
export async function setTheme(
  page: Page,
  theme: 'light' | 'dark'
): Promise<void> {
  await page.evaluate((t) => {
    localStorage.setItem('app-theme-preference', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, theme);
}

/**
 * In dark mode, scans for visible elements with area > 1500 px² whose computed background
 * has relative luminance > 0.72 (unthemed light surfaces).
 */
export async function lightSurfaces(page: Page): Promise<LightSurfaceInfo[]> {
  return page.evaluate(() => {
    function parseRgb(
      color: string
    ): { r: number; g: number; b: number; a: number } | null {
      const match = color.match(
        /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/
      );
      if (!match) return null;
      return {
        r: parseInt(match[1], 10),
        g: parseInt(match[2], 10),
        b: parseInt(match[3], 10),
        a: match[4] !== undefined ? parseFloat(match[4]) : 1,
      };
    }

    function calculateRelativeLuminance(
      r: number,
      g: number,
      b: number
    ): number {
      const srgb = [r, g, b].map((val) => {
        const s = val / 255;
        return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }

    function buildSelector(el: Element): string {
      const testId = el.getAttribute('data-testid');
      if (testId) return `[data-testid="${testId}"]`;
      if (el.getAttribute('role') === 'tooltip' || el.classList.contains('tooltip')) {
        return '[role="tooltip"]';
      }
      if (el.id && !el.id.startsWith('tooltip-') && !/^[a-z]+-[a-z0-9]{5,}$/i.test(el.id)) {
        return `#${el.id}`;
      }
      const tag = el.tagName.toLowerCase();
      const classes =
        typeof el.className === 'string' && el.className.trim()
          ? el.className
              .trim()
              .split(/\s+/)
              .filter((c) => !c.startsWith('ng-'))
              .slice(0, 2)
              .join('.')
          : '';
      return classes ? `${tag}.${classes}` : tag;
    }

    const results: Array<{
      selector: string;
      tagName: string;
      area: number;
      backgroundColor: string;
      luminance: number;
    }> = [];

    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      const style = window.getComputedStyle(el);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0'
      ) {
        continue;
      }

      const rect = el.getBoundingClientRect();
      const area = Math.round(rect.width * rect.height);
      if (area <= 1500) continue;

      const parsed = parseRgb(style.backgroundColor);
      if (!parsed || parsed.a < 0.1) continue;

      const lum = calculateRelativeLuminance(parsed.r, parsed.g, parsed.b);
      if (lum > 0.72) {
        results.push({
          selector: buildSelector(el),
          tagName: el.tagName.toLowerCase(),
          area,
          backgroundColor: style.backgroundColor,
          luminance: Math.round(lum * 1000) / 1000,
        });
      }
    }

    return results;
  });
}
