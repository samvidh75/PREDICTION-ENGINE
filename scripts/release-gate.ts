/**
 * TRACK-P4B — Release Gate
 *
 * Runs every mandatory check required before a release can proceed.
 * Writes a machine-readable report to reports/release/release-gate.json.
 *
 * Usage: npx tsx scripts/release-gate.ts
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// ── Types ──────────────────────────────────────────────────────────────

interface GateCheck {
  name: string;
  command: string;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  mandatory: boolean;
  skipped: boolean;
}

interface GateReport {
  timestamp: string;
  nodeVersion: string;
  totalDurationMs: number;
  passed: number;
  failed: number;
  skipped: number;
  mandatoryFailed: number;
  exitCode: number;
  checks: GateCheck[];
}

// ── Output directory ───────────────────────────────────────────────────

const reportDir = resolve(process.cwd(), 'reports', 'release');
mkdirSync(reportDir, { recursive: true });

// ── Checks definition ──────────────────────────────────────────────────

// Checks listed in the order they should run.  A script is considered
// “missing” when npm errors with "Missing script" — those are skipped if
// non-mandatory, or counted as a failure if mandatory.

interface CheckDef {
  name: string;
  command: string;
  mandatory: boolean;
}

const checkDefs: CheckDef[] = [
  { name: 'Lint (ESLint)', command: 'npm run lint', mandatory: true },
  { name: 'TypeScript typecheck (all)', command: 'npm run typecheck:all', mandatory: true },
  { name: 'Unit tests', command: 'npm run test:unit', mandatory: true },
  { name: 'SQLite integration tests', command: 'npm run test:integration:sqlite', mandatory: true },
  { name: 'PostgreSQL integration tests (CI)', command: 'npm run test:integration:postgres:ci', mandatory: true },
  { name: 'Coverage', command: 'npm run test:coverage', mandatory: true },
  { name: 'Schema validation', command: 'npm run validate:schema', mandatory: true },
  { name: 'Query schema validation', command: 'npm run validate:query-schema', mandatory: true },
  { name: 'Distribution validation', command: 'npm run validate:distributions', mandatory: true },
  { name: 'Data integrity validation', command: 'npm run validate:data-integrity', mandatory: true },
  { name: 'Repository hygiene', command: 'npm run validate:hygiene', mandatory: true },
  { name: 'Frontend build (Vercel)', command: 'npm run build:vercel', mandatory: true },
  { name: 'Backend build', command: 'npm run build:backend', mandatory: true },
  { name: 'Backend compile', command: 'npm run compile:backend', mandatory: true },
  { name: 'Dependency audit', command: 'npm audit --audit-level=high', mandatory: true },
  { name: 'API smoke test', command: 'npm run smoke:api', mandatory: true },
];

// ── Helpers ────────────────────────────────────────────────────────────

const MISSING_SCRIPT_PATTERN = /Missing script:/i;

function isMissingScriptError(stderr: string): boolean {
  return MISSING_SCRIPT_PATTERN.test(stderr);
}

function runCheck(def: CheckDef): GateCheck {
  const start = Date.now();
  let exitCode: number | null = null;
  let stdout = '';
  let stderr = '';
  let skipped = false;

  try {
    const result = execSync(def.command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 300_000, // 5 minutes per check
      env: { ...process.env, CI: 'true' },
    });
    stdout = result;
    exitCode = 0;
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & {
      stdout?: Buffer | string;
      stderr?: Buffer | string;
      status?: number;
      signal?: NodeJS.Signals;
    };

    stdout = bufferToString(e.stdout) || '';
    stderr = bufferToString(e.stderr) || '';

    if (isMissingScriptError(stderr)) {
      skipped = true;
      exitCode = null;
    } else {
      exitCode = e.status ?? 1;
    }
  }

  const durationMs = Date.now() - start;

  return {
    name: def.name,
    command: def.command,
    exitCode,
    stdout: truncate(stdout, 5000),
    stderr: truncate(stderr, 5000),
    durationMs,
    mandatory: def.mandatory,
    skipped,
  };
}

function bufferToString(buf: Buffer | string | undefined): string {
  if (buf === undefined) return '';
  if (typeof buf === 'string') return buf;
  return buf.toString('utf-8');
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + '…[truncated]';
}

// ── Main ───────────────────────────────────────────────────────────────

const overallStart = Date.now();
const checks: GateCheck[] = [];

console.log('╔══════════════════════════════════════════╗');
console.log('║     PREDICTION-ENGINE RELEASE GATE      ║');
console.log('╚══════════════════════════════════════════╝\n');

for (const def of checkDefs) {
  process.stdout.write(`${def.name}... `);

  const check = runCheck(def);
  checks.push(check);

  if (check.skipped) {
    if (check.mandatory) {
      console.log('✗ FAIL (MANDATORY — script missing)');
    } else {
      console.log('⊘ SKIP (script not found)');
    }
  } else if (check.exitCode === 0) {
    console.log(`✓ PASS (${check.durationMs}ms)`);
  } else {
    if (check.mandatory) {
      console.log('✗ FAIL (MANDATORY)');
    } else {
      console.log('⚠ WARN');
    }
  }
}

const totalDurationMs = Date.now() - overallStart;
const passed = checks.filter((c) => !c.skipped && c.exitCode === 0).length;
const skipped = checks.filter((c) => c.skipped).length;
const failed = checks.filter((c) => !c.skipped && c.exitCode !== 0 && c.exitCode !== null).length;
const mandatoryFailed = checks.filter(
  (c) => c.mandatory && (c.skipped || (c.exitCode !== null && c.exitCode !== 0)),
).length;
const exitCode = mandatoryFailed > 0 ? 1 : 0;

// ── Console summary ────────────────────────────────────────────────────

const totalSeconds = (totalDurationMs / 1000).toFixed(1);
const total = checks.length;

console.log('\n═══════════════════════════════════════════');
console.log(`  Duration: ${totalSeconds}s`);
console.log(`  Passed: ${passed}/${total}`);
console.log(`  Failed: ${failed} (${mandatoryFailed} mandatory)`);
if (skipped > 0) console.log(`  Skipped: ${skipped}`);
console.log('═══════════════════════════════════════════\n');

if (mandatoryFailed > 0) {
  console.log('FAILED CHECKS:');
  for (const check of checks) {
    if (check.mandatory && (check.skipped || (check.exitCode !== null && check.exitCode !== 0))) {
      console.log(`\n  [MANDATORY] ${check.name}`);
      if (check.skipped) console.log('  Reason: script not found');
      if (check.stderr) {
        const preview = check.stderr.split('\n').slice(0, 5).join('\n  ');
        console.log(`  stderr:\n  ${preview}`);
      }
    }
  }
  console.log(`\nRELEASE GATE: FAIL (${mandatoryFailed} mandatory check(s) failed)`);
} else {
  console.log('\nRELEASE GATE: PASS');
}

// ── Write machine-readable report ─────────────────────────────────────

const report: GateReport = {
  timestamp: new Date().toISOString(),
  nodeVersion: process.version,
  totalDurationMs,
  passed,
  failed,
  skipped,
  mandatoryFailed,
  exitCode,
  checks,
};

const reportPath = resolve(reportDir, 'release-gate.json');
writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
console.log(`\nReport written to reports/release/release-gate.json`);

// ── Set exit code (never calls process.exit) ───────────────────────────

process.exitCode = exitCode;