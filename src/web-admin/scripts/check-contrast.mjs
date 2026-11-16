import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, 'contrast-pairs.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function parseHex(hex) {
  let cleaned = hex.replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  const num = parseInt(cleaned, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function relativeLuminance(rgb) {
  const r = sRgbToLinear(rgb.r);
  const g = sRgbToLinear(rgb.g);
  const b = sRgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fgHex, bgHex) {
  const l1 = relativeLuminance(parseHex(fgHex));
  const l2 = relativeLuminance(parseHex(bgHex));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

let totalChecked = 0;
let failures = 0;

console.log('--- WCAG Contrast Audit ---');

for (const [themeName, themeConfig] of Object.entries(manifest.themes)) {
  console.log(`\nTheme: [${themeName.toUpperCase()}]`);

  for (const group of ['text', 'boundaries']) {
    const pairs = themeConfig[group] || [];
    console.log(`  Checking ${group} (${pairs.length} pairs)...`);

    for (const pair of pairs) {
      totalChecked++;
      const ratio = contrastRatio(pair.foreground, pair.background);
      const passed = ratio >= pair.minRatio;
      const formattedRatio = ratio.toFixed(2) + ':1';
      const formattedMin = pair.minRatio + ':1';

      if (passed) {
        console.log(`    PASS  ${pair.name.padEnd(42)} ${pair.foreground} on ${pair.background} -> ${formattedRatio} (>= ${formattedMin})`);
      } else {
        failures++;
        console.error(`    FAIL  ${pair.name.padEnd(42)} ${pair.foreground} on ${pair.background} -> ${formattedRatio} (< ${formattedMin})`);
      }
    }
  }
}

console.log(`\nAudit Complete: ${totalChecked} checked, ${failures} failures.`);

if (failures > 0) {
  process.exit(1);
}
