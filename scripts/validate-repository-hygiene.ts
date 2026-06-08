/**
 * TRACK-P3 — Repository Hygiene Scanner
 * 
 * Scans for:
 * - .only() in test files
 * - debugger statements
 * - hardcoded production credentials patterns
 * - synthetic fallback markers
 * - silent demo portfolio injection patterns
 * - console.log of secrets
 * 
 * Usage: npx tsx scripts/validate-repository-hygiene.ts
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');
const SCRIPTS_DIR = path.join(process.cwd(), 'scripts');

const SECRET_PATTERNS = [
  /DATABASE_URL\s*=\s*(?!.*localhost)(?!.*postgres:\/\/stockstory:stockstory@localhost)/i,
  /COOKIE_SECRET\s*=\s*['"][\w!@#$%^&*()-]{10,}['"]/,
  /API_KEY\s*=\s*['"][\w-]{20,}['"]/,
  /bearer\s+[\w-]{20,}/i,
  /-----BEGIN\s+(RSA|OPENSSH|EC)\s+PRIVATE\s+KEY-----/,
];

const HAZARDOUS_PATTERNS = [
  { pattern: /\.only\(/, label: '.only() test focus' },
  { pattern: /describe\.only/, label: 'describe.only()' },
  { pattern: /it\.only/, label: 'it.only()' },
  { pattern: /test\.only/, label: 'test.only()' },
  { pattern: /debugger/, label: 'debugger statement' },
  { pattern: /console\.log\(.*(?:secret|password|token|key)/, label: 'console.log of potential secret' },
  { pattern: /synthetic.*fallback/i, label: 'synthetic fallback marker' },
  { pattern: /silent.*demo.*portfolio/i, label: 'silent demo injection' },
];

let errors = 0;
let warnings = 0;

function scanFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(process.cwd(), filePath);

    // Check for secret patterns
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        console.error(`  SECRET: ${relPath} — matches credential pattern`);
        errors++;
      }
    }

    // Check for hazardous patterns
    for (const { pattern, label } of HAZARDOUS_PATTERNS) {
      if (pattern.test(content)) {
        console.warn(`  WARN: ${relPath} contains ${label}`);
        warnings++;
      }
    }
  } catch (err) {
    // Skip unreadable files
  }
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    // Skip node_modules, dist, .git
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx') || entry.name.endsWith('.js') || entry.name.endsWith('.json') || entry.name === 'Dockerfile' || entry.name.endsWith('.yml') || entry.name.endsWith('.yaml')) {
      scanFile(fullPath);
    }
  }
}

console.log('=== Repository Hygiene Scan ===\n');

walkDir(SRC_DIR);
walkDir(SCRIPTS_DIR);

// Also scan root-level config files
const rootFiles = ['Dockerfile', 'render.yaml'];
for (const file of rootFiles) {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    scanFile(filePath);
  }
}

console.log(`\n=== Hygiene Scan Complete ===`);
console.log(`Errors (secrets): ${errors}`);
console.log(`Warnings (hazards): ${warnings}`);

if (errors > 0) {
  console.error('FAIL: Potential secrets detected');
  process.exit(1);
} else {
  console.log('PASS: No secrets detected');
  process.exit(0);
}
