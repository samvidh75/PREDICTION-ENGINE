/**
 * audit-public-copy.ts — Scans frontend source for forbidden public-facing terms.
 *
 * Usage:
 *   npx tsx scripts/audit-public-copy.ts
 *   npx tsx scripts/audit-public-copy.ts --fix
 */

import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIRS = [
  'src/components',
  'src/pages',
  'src/lib',
  'src/hooks',
  'src/views',
];

const FORBIDDEN_TERMS: { pattern: RegExp; context?: string }[] = [
  { pattern: /\bprovider\b/i, context: 'public UI - use "source" or omit' },
  { pattern: /\bfreshness\b/i, context: 'public UI - data quality term' },
  { pattern: /\bsource pending\b/i, context: 'public UI - use "being prepared"' },
  { pattern: /\bsource verified\b/i, context: 'public UI' },
  { pattern: /\bmigration\b/i, context: 'public UI - internal term' },
  { pattern: /\bbackfill\b/i, context: 'public UI - internal term' },
  { pattern: /\bdiagnostics\b/i, context: 'public UI - use "system status" or omit' },
  { pattern: /\bdata operations\b/i, context: 'public UI' },
  { pattern: /\bquote unavailable\b/i, context: 'public UI - use "price not available"' },
  { pattern: /\bhistory unavailable\b/i, context: 'public UI' },
  { pattern: /\bIndianAPI\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bYahoo\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bStockEdge\b/i, context: 'public UI - never expose provider name' },
  { pattern: /\bbackend\b/i, context: 'public UI - never use "backend"' },
  { pattern: /\bTrendlyne disabled\b/i, context: 'public UI - never show disabled state' },
  { pattern: /\bdata pipeline\b/i, context: 'public UI' },
  { pattern: /\bupstox(?!.*broker)/i, context: 'public UI - only in broker handoff context' },
];

interface FoundIssue {
  file: string;
  line: number;
  text: string;
  context: string;
}

function scanFile(filePath: string): FoundIssue[] {
  const issues: FoundIssue[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const entry of FORBIDDEN_TERMS) {
    for (let i = 0; i < lines.length; i++) {
      if (entry.pattern.test(lines[i])) {
        const trimmed = lines[i].trim().substring(0, 120);
        const isTestFile = filePath.includes('__tests__') || filePath.includes('.test.');
        const isReport = filePath.includes('reports/');
        if (isTestFile || isReport) continue;
        issues.push({
          file: path.relative(process.cwd(), filePath),
          line: i + 1,
          text: trimmed,
          context: entry.context || '',
        });
      }
    }
  }

  return issues;
}

function main(): void {
  const allIssues: FoundIssue[] = [];

  for (const dir of FRONTEND_DIRS) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) continue;

    const walk = (dirPath: string) => {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
          walk(fullPath);
        } else if (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) {
          const issues = scanFile(fullPath);
          allIssues.push(...issues);
        }
      }
    };
    walk(absDir);
  }

  console.log('Public Copy Audit');
  console.log('──────────────────────────────────────');
  console.log(`Scanned ${FRONTEND_DIRS.length} directories\n`);

  if (allIssues.length === 0) {
    console.log('No forbidden terms found in public UI.');
    process.exit(0);
  }

  console.log(`Found ${allIssues.length} potential issues:\n`);
  for (const issue of allIssues) {
    console.log(`  ${issue.file}:${issue.line}`);
    console.log(`    "${issue.text}"`);
    if (issue.context) console.log(`    → ${issue.context}`);
    console.log();
  }

  process.exit(1);
}

main();
