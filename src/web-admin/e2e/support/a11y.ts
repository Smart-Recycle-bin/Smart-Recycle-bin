import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export interface AxeViolationItem {
  id: string;
  impact: string;
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary?: string;
  }>;
}

/**
 * Runs an accessibility audit with Axe on the given page or context,
 * filtering for 'serious' and 'critical' impact violations.
 */
export async function runAxe(
  page: Page,
  options?: {
    include?: string | string[];
    exclude?: string | string[];
  }
): Promise<AxeViolationItem[]> {
  let builder = new AxeBuilder({ page });

  if (options?.include) {
    const includes = Array.isArray(options.include)
      ? options.include
      : [options.include];
    for (const inc of includes) {
      builder = builder.include(inc);
    }
  }

  if (options?.exclude) {
    const excludes = Array.isArray(options.exclude)
      ? options.exclude
      : [options.exclude];
    for (const exc of excludes) {
      builder = builder.exclude(exc);
    }
  }

  const results = await builder.analyze();

  const seriousOrCritical = results.violations.filter(
    (v) => v.impact === 'serious' || v.impact === 'critical'
  );

  return seriousOrCritical.map((v) => ({
    id: v.id,
    impact: v.impact ?? 'unknown',
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target.map(String),
      failureSummary: n.failureSummary,
    })),
  }));
}
