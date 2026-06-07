const fs = require('fs');
const path = require('path');

function findTestFiles(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findTestFiles(fullPath));
    } else if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx') || entry.name.endsWith('.test.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const srcDir = path.join(__dirname, '..', 'src');
const testFiles = findTestFiles(srcDir);

for (const fullPath of testFiles) {
  let content = fs.readFileSync(fullPath, 'utf-8');
  const original = content;
  
  // Remove vitest import lines
  content = content.replace(/^import\s+\{[^}]*\}\s+from\s+['"]vitest['"];?\s*\n/gm, '');
  
  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    const relPath = path.relative(path.join(__dirname, '..'), fullPath);
    console.log('Fixed: ' + relPath);
  }
}

console.log('Done. Found ' + testFiles.length + ' test files.');
