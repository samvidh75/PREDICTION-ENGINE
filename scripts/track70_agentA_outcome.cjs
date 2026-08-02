#!/usr/bin/env node
/**
 * TRACK-70 AGENT A — OutcomeRepository Enforcement
 * 
 * Searches entire repository for direct prediction_registry access patterns:
 *   - prediction_registry (table name in raw queries)
 *   - INSERT INTO prediction_registry
 *   - UPDATE prediction_registry
 *   - DELETE FROM prediction_registry
 * 
 * Proves which files bypass OutcomeRepository and which are compliant.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const REPORT_DIR = path.join(__dirname, '..', 'reports', 'track-70');
const REPORT_PATH = path.join(REPORT_DIR, 'A-outcome-enforcement.md');

if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Patterns to search for (case-insensitive for table names, case-sensitive for keywords)
const TABLE_PATTERNS = [
  'prediction_registry',
  'INSERT INTO prediction_registry',
  'UPDATE prediction_registry',
  'DELETE FROM prediction_registry',
  'FROM prediction_registry',
  'into prediction_registry',
];

// Files that are explicitly allowed (the OutcomeRepository itself + migration)
const ALLOWED_FILES = [
  'src/data/OutcomeRepository.ts',
  'src/db/migrations/008_create_prediction_registry.sql',
  'src/db/migrations',
];

function getAllFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build' || file === '.vite') continue;
      getAllFiles(fullPath, fileList);
    } else {
      // Only check .ts, .js, .cjs, .sql files
      if (/\.(ts|js|cjs|mjs|sql)$/.test(file)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

// Helper: check if a file is in the allowed list
function isAllowed(filePath) {
  const relative = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
  return ALLOWED_FILES.some(allowed => relative.startsWith(allowed));
}

// Search phase
const allFiles = getAllFiles(SRC_DIR).concat(getAllFiles(SCRIPTS_DIR));
const violations = [];
const compliant = [];

for (const filePath of allFiles) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const relativePath = path.relative(path.join(__dirname, '..'), filePath).replace(/\\/g, '/');
    
    const matches = [];
    for (const pattern of TABLE_PATTERNS) {
      const regex = new RegExp(pattern.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
      let match;
      while ((match = regex.exec(content)) !== null) {
        // Check if it's inside a string literal referencing table name
        matches.push({
          pattern,
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }
    
    if (matches.length > 0) {
      if (isAllowed(filePath)) {
        compliant.push({ file: relativePath, matches: matches.length, reason: 'Authorised (OutcomeRepository or migration)' });
      } else {
        violations.push({ file: relativePath, matches: matches.length, patterns: [...new Set(matches.map(m => m.pattern))] });
      }
    }
  } catch (e) {
    // skip unreadable files
  }
}

// Generate report
const report = `# TRACK-70 Agent A — OutcomeRepository Enforcement

**Generated:** ${new Date().toISOString()}

## Summary

- **Total files scanned:** ${allFiles.length}
- **Files with prediction_registry references:** ${violations.length + compliant.length}
- **Compliant files (OutcomeRepository or migrations):** ${compliant.length}
- **VIOLATIONS (bypass OutcomeRepository):** ${violations.length}

## OutcomeRepository

The official \`OutcomeRepository\` is defined in \`src/data/OutcomeRepository.ts\` and provides:
- \`findOutcomes()\` — the ONLY authorised read pathway
- \`recordOutcome()\` — the ONLY authorised write pathway
- \`recordOutcomesBulk()\` — bulk writes
- \`getSummary()\` / \`getAllSummaries()\` / \`getWalkForward()\` — aggregation queries

All queries go through \`import pool from '../db/index'\` and use parameterised PostgreSQL queries against \`prediction_registry\`.

## Compliant Files (Access Through OutcomeRepository Only)

${compliant.length === 0 ? '**None found.**' : compliant.map(c => `- \`${c.file}\` — ${c.reason}`).join('\n')}

## Violations (Bypass OutcomeRepository)

${violations.length === 0 ? '**No violations found. All prediction_registry access goes through OutcomeRepository.**' : violations.map(v => `### \`${v.file}\`\n- **Match count:** ${v.matches}\n- **Patterns:** ${v.patterns.join(', ')}\n- **Severity:** BYPASS`).join('\n\n')}

## Verdict

${violations.length === 0 ? 
  '**PASS** — OutcomeRepository is the sole access pathway for prediction_registry. Enforcement is complete.' :
  `**FAIL** — ${violations.length} files bypass OutcomeRepository. Enforcement is incomplete.`
}

## Exact Count of Remaining Violations

**${violations.length}**
`;

fs.writeFileSync(REPORT_PATH, report, 'utf-8');
console.log(`Agent A report written to ${REPORT_PATH}`);
console.log(`Files scanned: ${allFiles.length}, Violations: ${violations.length}`);
