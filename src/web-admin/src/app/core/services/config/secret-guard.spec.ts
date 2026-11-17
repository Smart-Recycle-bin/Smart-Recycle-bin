import { describe, it, expect } from 'vitest';

declare function require(name: string): any;
declare const process: any;

describe('Secret Guard Security Audit', () => {
  const fs: any = require('fs');
  const path: any = require('path');

  const prefix = 'AIza';
  const body = '[0-9A-Za-z_-]{35}';
  const googleApiKeyRegex = new RegExp(`\\b${prefix}${body}\\b`, 'g');

  function walkDirectory(dir: string, fileList: string[] = []): string[] {
    if (!fs.existsSync(dir)) return fileList;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'dist') {
          walkDirectory(fullPath, fileList);
        }
      } else {
        fileList.push(fullPath);
      }
    }
    return fileList;
  }

  it('fails if any Google API key pattern appears in src/, docs/, or e2e/', () => {
    const cwd = process.cwd();
    const directoriesToScan = [
      path.resolve(cwd, 'src'),
      path.resolve(cwd, 'docs'),
      path.resolve(cwd, 'e2e'),
    ];

    const violations: { file: string; line: number; text: string }[] = [];

    for (const scanDir of directoriesToScan) {
      const files = walkDirectory(scanDir);
      for (const file of files) {
        // Exclude this test file itself so dynamic regex definition does not self-trigger
        if (file.endsWith('secret-guard.spec.ts')) {
          continue;
        }

        try {
          const content = fs.readFileSync(file, 'utf8');
          const lines = content.split('\n');

          lines.forEach((lineText: string, lineIdx: number) => {
            googleApiKeyRegex.lastIndex = 0;
            if (googleApiKeyRegex.test(lineText)) {
              violations.push({
                file: path.relative(cwd, file).replace(/\\/g, '/'),
                line: lineIdx + 1,
                text: lineText.trim(),
              });
            }
          });
        } catch {
          // Skip binary files
        }
      }
    }

    expect(violations).toEqual([]);
  });
});

