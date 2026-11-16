import * as fs from 'fs';
import * as path from 'path';
import { expect } from '@playwright/test';
import { AxeViolationItem } from './a11y';
import { LightSurfaceInfo } from './theme';

export interface A11yBaselineEntry {
  id: string;
  target?: string;
}

export type A11yBaseline = Record<string, A11yBaselineEntry[]>;
export type DarkAllowlist = Record<string, string[]>;

const A11Y_BASELINE_PATH = path.resolve(__dirname, '../a11y-baseline.json');
const DARK_ALLOWLIST_PATH = path.resolve(__dirname, '../dark-allowlist.json');

export function loadA11yBaseline(): A11yBaseline {
  if (!fs.existsSync(A11Y_BASELINE_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(A11Y_BASELINE_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveA11yBaseline(data: A11yBaseline): void {
  fs.writeFileSync(A11Y_BASELINE_PATH, JSON.stringify(data, null, 2) + '\n');
}

export function loadDarkAllowlist(): DarkAllowlist {
  if (!fs.existsSync(DARK_ALLOWLIST_PATH)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(DARK_ALLOWLIST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveDarkAllowlist(data: DarkAllowlist): void {
  fs.writeFileSync(DARK_ALLOWLIST_PATH, JSON.stringify(data, null, 2) + '\n');
}

export function normalizeTargetSelector(target: string): string {
  if (!target) return target;
  return target
    .replace(/\[_ng(content|host)[^\]]*\]/g, '')
    .replace(
      /#(select|async-select|input|number|textarea|checkbox|toggle|date|file|tooltip|area-grad)-[a-z0-9]+/g,
      (match) => {
        const prefix = match.slice(1).replace(/-[a-z0-9]+$/, '');
        return `[id^="${prefix}-"]`;
      }
    )
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Asserts accessibility violations against baseline with ratchet enforcement:
 * 1. Fails if new violations occur that are not in the baseline.
 * 2. Fails if a baseline violation is fixed (no longer occurs), requiring baseline shrinking.
 */
export function assertA11yBaseline(
  scenarioKey: string,
  actualViolations: AxeViolationItem[],
  baseline: A11yBaseline,
  browserName = 'chromium'
): void {
  const expectedEntries = baseline[scenarioKey] ?? [];

  // Flatten actual violations into key signatures: "${id}::${target}"
  const actualSignatures: string[] = [];
  for (const v of actualViolations) {
    if (!v.nodes || v.nodes.length === 0) {
      actualSignatures.push(`${v.id}::page`);
    } else {
      for (const node of v.nodes) {
        const target = normalizeTargetSelector(node.target.join(' '));
        actualSignatures.push(`${v.id}::${target}`);
      }
    }
  }

  const expectedSignatures = expectedEntries.map((e) =>
    e.target ? `${e.id}::${normalizeTargetSelector(e.target)}` : `${e.id}::any`
  );

  // 1. Check for unexpected violations (strictly enforced on all browsers)
  const unexpected = actualSignatures.filter((sig) => {
    const [id] = sig.split('::');
    return !expectedSignatures.includes(sig) && !expectedSignatures.includes(`${id}::any`);
  });

  // 2. Check for stale baseline entries (ratchet: must fail if violation was fixed on primary browser)
  const stale = expectedSignatures.filter((expSig) => {
    const [id, target] = expSig.split('::');
    if (target === 'any') {
      return !actualSignatures.some((act) => act.startsWith(`${id}::`));
    }
    return !actualSignatures.includes(expSig);
  });

  if (unexpected.length > 0) {
    expect(
      unexpected,
      `[A11Y REGRESSION] Unexpected accessibility violations in scenario "${scenarioKey}":\n` +
        unexpected.join('\n')
    ).toEqual([]);
  }

  if (stale.length > 0 && browserName === 'chromium') {
    expect(
      stale,
      `[A11Y RATCHET] The following baseline entries no longer occur in "${scenarioKey}"! ` +
        `The baseline must shrink. Please remove them from e2e/a11y-baseline.json:\n` +
        stale.join('\n')
    ).toEqual([]);
  }
}

/**
 * Asserts dark surfaces against allowlist with ratchet enforcement:
 * 1. Fails if new light surfaces occur that are not allowlisted.
 * 2. Fails if an allowlisted light surface was fixed/themed, requiring allowlist shrinking.
 */
export function assertDarkAllowlist(
  scenarioKey: string,
  surfaces: LightSurfaceInfo[],
  allowlist: DarkAllowlist,
  browserName = 'chromium'
): void {
  const expectedSelectors = allowlist[scenarioKey] ?? [];
  const actualSelectors = surfaces.map((s) => s.selector);

  // 1. Unexpected light surfaces (strictly enforced on all browsers)
  const unexpected = actualSelectors.filter(
    (sel) => !expectedSelectors.some((exp) => sel.includes(exp) || exp.includes(sel))
  );

  // 2. Stale allowlist entries (ratchet: must fail if surface themed on primary browser)
  const stale = expectedSelectors.filter(
    (exp) => !actualSelectors.some((act) => act.includes(exp) || exp.includes(act))
  );

  if (unexpected.length > 0) {
    expect(
      unexpected,
      `[DARK REGRESSION] Unthemed light surfaces found in dark mode on "${scenarioKey}":\n` +
        JSON.stringify(surfaces, null, 2)
    ).toEqual([]);
  }

  if (stale.length > 0 && browserName === 'chromium') {
    expect(
      stale,
      `[DARK RATCHET] The following dark-allowlist entries no longer occur in "${scenarioKey}"! ` +
        `The allowlist must shrink. Please remove them from e2e/dark-allowlist.json:\n` +
        stale.join('\n')
    ).toEqual([]);
  }
}
