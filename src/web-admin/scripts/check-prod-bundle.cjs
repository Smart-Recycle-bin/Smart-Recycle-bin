const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'dist', 'ecobin-admin', 'browser');
if (!fs.existsSync(dir)) {
  console.error(`Dist directory not found at ${dir}`);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.js'));
const badPatterns = ['wrongpass', 'mock_jwt', 'No mock handler', 'Laila Hamdy'];

let foundLeak = false;

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const pattern of badPatterns) {
    if (content.includes(pattern)) {
      console.error(`PROD BUNDLE LEAK: "${pattern}" found in ${file}`);
      foundLeak = true;
    }
  }
}

if (foundLeak) {
  console.error('Production bundle check failed: mock artifacts leaked into production.');
  process.exit(1);
}

console.log('Prod bundle check passed: zero mock leaks detected.');
