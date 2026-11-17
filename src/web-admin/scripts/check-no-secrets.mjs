import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Avoid self-matching by constructing regex dynamically
const prefix = 'AIza';
const body = '[0-9A-Za-z_-]{35}';
const secretPattern = new RegExp(`\\b${prefix}${body}\\b`, 'g');

const filesToCheck = new Set();

// 1. Scan all tracked files in git
try {
  const gitOutput = execSync('git ls-files', { cwd: projectRoot, encoding: 'utf8' });
  const gitFiles = gitOutput.split('\n').map((f) => f.trim()).filter(Boolean);
  for (const f of gitFiles) {
    filesToCheck.add(path.resolve(projectRoot, f));
  }
} catch (err) {
  console.warn('Warning: could not execute "git ls-files". Falling back to directory scan.');
}

// 2. Scan dist/ directory if present
const distDir = path.resolve(projectRoot, 'dist');
function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full);
    } else {
      filesToCheck.add(full);
    }
  }
}
walkDir(distDir);

let violations = [];

for (const filePath of filesToCheck) {
  // Skip this script itself and secret-guard test files that test the scanner logic
  if (filePath === __filename || filePath.endsWith('check-no-secrets.mjs') || filePath.endsWith('secret-guard.spec.ts')) {
    continue;
  }

  if (!fs.existsSync(filePath)) continue;

  try {
    const stats = fs.statSync(filePath);
    if (stats.size > 2 * 1024 * 1024) continue; // Skip huge binaries

    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      secretPattern.lastIndex = 0;
      if (secretPattern.test(line)) {
        violations.push({
          file: path.relative(projectRoot, filePath),
          line: index + 1,
        });
      }
    });
  } catch {
    // Ignore non-readable binary files
  }
}

if (violations.length > 0) {
  console.error('\n❌ CRITICAL: Google API Key pattern detected in files:');
  for (const v of violations) {
    console.error(`  - ${v.file}:${v.line}`);
  }
  process.exit(1);
} else {
  console.log('✅ Secret check passed: no Google API keys detected in tracked files or dist.');
  process.exit(0);
}
