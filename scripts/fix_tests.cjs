const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all test files
const testFiles = glob.sync('src/**/*.test.{ts,tsx}', { cwd: __dirname + '/..' });

for (const file of testFiles) {
  const fullPath = path.join(__dirname, '..', file);
  let content = fs.readFileSync(fullPath, 'utf-8');
  
  // Remove imports from vitest
  const original = content;
  content = content.replace(/^import\s+\{[^}]*\}\s+from\s+['"]vitest['"];?\s*\n/gm, '');
  
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`Fixed: ${file}`);
  } else {
    console.log(`No change: ${file}`);
  }
}

console.log(`\nProcessed ${testFiles.length} files.`);
