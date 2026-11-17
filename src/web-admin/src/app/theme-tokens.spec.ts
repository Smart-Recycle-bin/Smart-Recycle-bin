import { describe, it, expect } from 'vitest';

declare function require(name: string): any;
declare const process: any;

describe('Theme Tokens and Color Policy Guard', () => {
  const fs: any = require('fs');
  const path: any = require('path');
  const cwd = process.cwd();
  const stylesCssPath = path.resolve(cwd, 'src/styles.css');

  it('defines all required semantic tokens in styles.css for both light and dark themes', () => {
    expect(fs.existsSync(stylesCssPath)).toBe(true);
    const content: string = fs.readFileSync(stylesCssPath, 'utf8');

    const requiredTokens = [
      '--surface',
      '--surface-raised',
      '--surface-muted',
      '--border',
      '--border-strong',
      '--text',
      '--text-muted',
      '--text-inverse',
      '--primary',
      '--primary-fg',
      '--primary-soft',
      '--success-fg',
      '--success-bg',
      '--success-border',
      '--warning-fg',
      '--warning-bg',
      '--warning-border',
      '--danger-fg',
      '--danger-bg',
      '--danger-border',
      '--info-fg',
      '--info-bg',
      '--info-border',
      '--focus-ring',
      '--overlay-backdrop',
      '--chart-1',
      '--chart-2',
      '--chart-3',
      '--chart-4',
      '--chart-5',
      '--chart-6',
    ];

    const rootBlockMatch = content.match(/:root\s*\{([^}]+)\}/s);
    expect(rootBlockMatch).toBeTruthy();
    const rootBlock = rootBlockMatch![1];

    const darkBlockMatch = content.match(/\.dark\s*\{([^}]+)\}/s);
    expect(darkBlockMatch).toBeTruthy();
    const darkBlock = darkBlockMatch![1];

    for (const token of requiredTokens) {
      expect(rootBlock).toContain(token);
      expect(darkBlock).toContain(token);
    }
  });

  it('ensures no unauthorized literal colors exist in component templates, stylesheets, and sources', () => {
    function walkSync(dir: string, fileList: string[] = []): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules' && entry.name !== '.git') {
            walkSync(fullPath, fileList);
          }
        } else if (
          /\.(css|html|ts)$/.test(entry.name) &&
          !entry.name.endsWith('.spec.ts') &&
          !entry.name.endsWith('styles.css')
        ) {
          fileList.push(fullPath);
        }
      }
      return fileList;
    }

    const appDir = path.resolve(cwd, 'src/app');
    const files = walkSync(appDir);

    const hexColorRegex = /#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
    const rgbaColorRegex = /rgba?\([^)]+\)/g;

    const violations: { file: string; line: number; match: string; text: string }[] = [];

    for (const file of files) {
      const normalizedPath: string = file.replace(/\\/g, '/');
      const content: string = fs.readFileSync(file, 'utf8');
      const lines: string[] = content.split('\n');

      lines.forEach((lineText: string, lineIdx: number) => {
        const trimmed = lineText.trim();

        // 1. Check for literal hex colors
        let match: RegExpExecArray | null;
        while ((match = hexColorRegex.exec(lineText)) !== null) {
          const hex = match[0];

          // Allowlist:
          // A: theme-color meta tag in theme.service.ts
          if (
            normalizedPath.endsWith('core/services/theme/theme.service.ts') &&
            (hex === '#0A101F' || hex === '#009966' || hex === '#008556')
          ) {
            continue;
          }

          // B: Non-color digit-only string patterns in mock data/templates like "Bin #0007" or "Bin #104"
          if (/Bin\s*#[0-9]+/i.test(lineText)) {
            continue;
          }

          // C: Curated reward card gradient pairs (p12 fallback: green, cyan, teal, amber, purple, rose, slate, bronze)
          if (normalizedPath.endsWith('features/reward/catalog/catalog.config.ts')) {
            continue;
          }

          violations.push({
            file: path.relative(cwd, file).replace(/\\/g, '/'),
            line: lineIdx + 1,
            match: hex,
            text: trimmed,
          });
        }

        // 2. Check for rgb / rgba usage
        while ((match = rgbaColorRegex.exec(lineText)) !== null) {
          const rgba = match[0];

          // Allowlist:
          // A: box-shadow declarations
          if (trimmed.startsWith('box-shadow') || trimmed.includes('box-shadow:')) {
            continue;
          }

          // B: CSS gradient overlays / progress striped patterns with white opacity
          if (
            normalizedPath.endsWith('shared/components/progress/progress.css') &&
            rgba === 'rgba(255, 255, 255, 0.2)'
          ) {
            continue;
          }

          violations.push({
            file: path.relative(cwd, file).replace(/\\/g, '/'),
            line: lineIdx + 1,
            match: rgba,
            text: trimmed,
          });
        }
      });
    }

    expect(violations).toEqual([]);
  });
});
