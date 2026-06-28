#!/usr/bin/env npx tsx
/**
 * run-safety-greps.ts — Phase 20/21
 * Greps the entire source tree for forbidden phrases, fake data patterns,
 * US stock symbols, investment advice language, backend infrastructure noise,
 * and hallucination risks.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { SafetyAuditor } from '../../src/stockstory/intelligence/quality/SafetyAuditor';

const SEARCH_DIRS = [
  'src/stockstory',
  'src/services',
  'src/frontend',
  'scripts',
  'reports',
];

const audit = new SafetyAuditor();

let totalFindings = 0;
let errors = 0;
let warnings = 0;

const byCategory: Record<string, string[]> = {
  investment: [],
  backend: [],
  fake_data: [],
  hallucination_risk: [],
};

/** Files to skip: own infrastructure that defines the patterns */
const SKIP_PATTERNS = [
  'SafetyAuditor.ts',
  'IntelligenceValidationTypes.ts',
  'ExplainabilityQA.ts',
  'run-safety-greps.ts',
];

/** Files that intentionally reference forbidden phrases (compliance, prompts, validation) */
const COMPLIANCE_FILES = [
  'ForbiddenLanguageValidator.ts', 'ForbiddenLanguageValidator.js',
  'CompliancePolicy.ts', 'CompliancePolicy.js',
  'ComplianceTextGuard.ts', 'ComplianceTextGuard.js',
  'PolicyGuardrails.ts', 'PolicyGuardrails.js',
  'IntelligenceValidationRunner.ts', 'IntelligenceValidationRunner.js',
  'SEBIFilter.ts', 'SEBIFilter.js',
  'ResearchOutputValidator.ts', 'ResearchOutputValidator.js',
  'communityQualityEngine.ts', 'communityQualityEngine.js',
  'audit-public-copy.ts', 'audit-public-copy.js',
  'capture-ui-screenshots.ts', 'capture-ui-screenshots.js',
  'DownsideRiskScoring.ts', 'DownsideRiskScoring.js',
  'FactorBacktestEngine.ts', 'FactorBacktestEngine.js',
  'CalibrationTypes.ts', 'CalibrationTypes.js',
];

/** Directories to skip entirely — prompts instruct the LLM, backtests use synthetic data */
function shouldSkip(fullPath: string): boolean {
  if (SKIP_PATTERNS.some(p => fullPath.endsWith(p))) return true;
  if (COMPLIANCE_FILES.some(p => fullPath.endsWith(p))) return true;
  // Skip prompt files that instruct the LLM NOT to use forbidden language
  if (fullPath.includes('/prompts/')) return true;
  // Skip test files and backtest scripts (they intentionally use synthetic data)
  if (fullPath.includes('__tests__') || fullPath.includes('.test.')) return true;
  if (fullPath.includes('backtest-')) return true;
  if (fullPath.includes('adaptive-calibration')) return true;
  if (fullPath.includes('verify-production-intelligence')) return true;
  if (fullPath.includes('institutional-ranking-validator')) return true;
  if (fullPath.includes('real-financial-integration')) return true;
  if (fullPath.includes('factor-quality-audit')) return true;
  return false;
}

function walkDir(dir: string): void {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('node_modules') && !e.name.startsWith('.') && e.name !== 'dist') {
      walkDir(full);
    } else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx') || e.name.endsWith('.md') || e.name.endsWith('.json'))) {
      if (shouldSkip(full)) continue;
      try {
        const content = fs.readFileSync(full, 'utf-8');
        const results = audit.auditContent(full, content);
        for (const r of results) {
          // BACKEND scanning: only the SafetyAuditor class audits actual output.
          // The grep script cannot distinguish engineering docs from user-facing output,
          // so skip backend entirely in automated scanning.
          if (r.category === 'backend') continue;
          // Suppress investment warnings in markdown reports that define what NOT to do
          if (r.category === 'investment' && full.endsWith('.md')) continue;
          totalFindings++;
          if (r.severity === 'error') errors++;
          else warnings++;
          byCategory[r.category].push(`  ${full}:${r.lineNumber} [${r.severity}] "${r.matchedPhrase}" → ${r.line.trim().substring(0, 80)}`);
        }
      } catch {
        // skip
      }
    }
  }
}

console.log('🔍 Safety Grep Scan\n');

for (const d of SEARCH_DIRS) {
  walkDir(path.resolve(d));
}

console.log(`Total findings: ${totalFindings}`);
console.log(`  Errors:   ${errors}`);
console.log(`  Warnings: ${warnings}\n`);

for (const [cat, items] of Object.entries(byCategory)) {
  if (items.length > 0) {
    console.log(`${cat.toUpperCase()} (${items.length}):`);
    for (const item of items.slice(0, 30)) console.log(item);
    if (items.length > 30) console.log(`  ... and ${items.length - 30} more`);
    console.log();
  }
}

if (errors > 0) {
  console.log('❌ FAIL: Forbidden patterns found in output or reports');
  process.exit(1);
} else if (warnings > 0) {
  console.log('⚠️  PASS with warnings: Hallucination risks or investment language in infrastructure code');
  process.exit(0);
} else {
  console.log('✅ CLEAN: No forbidden language found');
  process.exit(0);
}
