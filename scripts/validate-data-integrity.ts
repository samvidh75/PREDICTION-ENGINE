/**
 * TRACK-P3B — Data Integrity Validator
 * 
 * Asserts no silent synthetic fallbacks, no demo-to-production leakage,
 * no fabricated provider claims, no unavailable-to-stable conversion.
 * 
 * Scans active source code for integrity-violating patterns.
 * 
 * Usage: npx tsx scripts/validate-data-integrity.ts
 */

import fs from 'fs';
import path from 'path';

const SRC_DIR = path.join(process.cwd(), 'src');

interface Pattern {
  description: string;
  pattern: RegExp;
  severity: 'critical' | 'warning';
}

const INTEGRITY_PATTERNS: Pattern[] = [
  {
    description: 'Silent synthetic fallback injection',
    pattern: /synthetic.*default|fallback.*synthetic|synthetic.*company/i,
    severity: 'critical',
  },
  {
    description: 'Fabricated "live" claim without evidence',
    pattern: /["']live["'].*freshness|freshness.*["']live["']/i,
    severity: 'warning',
  },
  {
    description: 'Fabricated "validated" claim without source',
    pattern: /["']validated["'].*false|fake.*validated|validated.*fake/i,
    severity: 'critical',
  },
  {
    description: 'Silent demo portfolio injection',
    pattern: /demo.*positions.*HDFCBANK|default.*positions.*RELIANCE.*TCS/i,
    severity: 'critical',
  },
  {
    description: 'Demo-to-production cache leakage risk',
    pattern: /cache\.set\(['"]company|intelligenceCache\.set.*demo/i,
    severity: 'warning',
  },
  {
    description: 'Unavailable-to-stable conversion',
    pattern: /unavailable.*converted|converted.*stable|null.*default.*stable/i,
    severity: 'critical',
  },
  {
    description: 'Hardcoded sample holdings as production defaults',
    pattern: /positions\s*=\s*\[\s*['"]RELIANCE['"]\s*,\s*['"]TCS['"]/,
    severity: 'warning',
  },
  {
    description: 'Fake provider claim',
    pattern: /provider.*fake|fake.*provider|made.*up.*provider/,
    severity: 'critical',
  },
  {
    description: 'Mock data in production path',
    pattern: /mock.*production|production.*mock/,
    severity: 'critical',
  },
];

let criticalErrors = 0;
let warnings = 0;

function scanFile(filePath: string): void {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relPath = path.relative(process.cwd(), filePath);
    
    for (const { description, pattern, severity } of INTEGRITY_PATTERNS) {
      if (pattern.test(content)) {
        if (severity === 'critical') {
          console.error(`  CRITICAL: ${relPath} — ${description}`);
          criticalErrors++;
        } else {
          console.warn(`  WARN: ${relPath} — ${description}`);
          warnings++;
        }
      }
    }
  } catch {
    // Skip unreadable files
  }
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name === 'coverage') continue;
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      scanFile(fullPath);
    }
  }
}

console.log('=== Data Integrity Validation ===\n');

walkDir(SRC_DIR);

console.log(`\n=== Data Integrity Complete ===`);
console.log(`Critical errors: ${criticalErrors}`);
console.log(`Warnings: ${warnings}`);

if (criticalErrors > 0) {
  console.error('FAIL: Data integrity violations found');
  process.exit(1);
} else {
  console.log('PASS: No critical data integrity violations');
  process.exit(0);
}
