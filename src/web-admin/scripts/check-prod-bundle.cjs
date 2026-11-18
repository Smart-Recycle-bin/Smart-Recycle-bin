const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist', 'ecobin-admin', 'browser');
if (!fs.existsSync(dir)) {
  console.error(`Dist directory not found at ${dir}`);
  process.exit(1);
}

let foundViolation = false;

// 1. Verify excluded mock asset directories
const mockDir = path.join(dir, 'mock');
if (fs.existsSync(mockDir)) {
  console.error(`PROD ASSET LEAK: "mock/" directory found in production build output at ${mockDir}`);
  foundViolation = true;
}

// 2. Verify excluded runtime configuration files
const forbiddenConfigFiles = ['config.json', 'config.example.json'];
for (const cfgFile of forbiddenConfigFiles) {
  const cfgPath = path.join(dir, cfgFile);
  if (fs.existsSync(cfgPath)) {
    console.error(`PROD ASSET LEAK: "${cfgFile}" found in production build output at ${cfgPath}`);
    foundViolation = true;
  }
}

// 3. Scan JavaScript chunks for forbidden mock credentials and leak patterns
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const badPatterns = [
  'wrongpass',
  'mock_jwt',
  'No mock handler',
  'Laila Hamdy',
  'password123',
  'admin@ecobin.eg',
  'mock/placeholder',
  'unsplash',
];

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of badPatterns) {
    if (content.includes(pattern)) {
      console.error(`PROD BUNDLE LEAK: "${pattern}" found in ${file}`);
      foundViolation = true;
    }
  }
}

if (foundViolation) {
  console.error('Production bundle check failed: mock artifacts, configs, or leaks detected in production.');
  process.exit(1);
}

console.log('Prod bundle check passed: zero mock leaks or config artifacts detected.');
