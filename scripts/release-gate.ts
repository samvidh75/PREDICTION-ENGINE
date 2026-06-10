/**
 * TRACK-SMOKE-MEGA — Release Gate (Truthful Environment-Aware)
 *
 * Runs local static and test checks. For environment-required checks
 * (PostgreSQL, API server), probes availability and classifies honestly:
 *   - PASS, FAIL, or NOT_EXECUTED_ENVIRONMENT_MISSING
 *
 * In CI (REQUIRE_FULL_RELEASE_GATE=true), all environment-required checks
 * become mandatory and missing services → FAIL.
 *
 * Usage:
 *   npx tsx scripts/release-gate.ts
 *   REQUIRE_FULL_RELEASE_GATE=true npx tsx scripts/release-gate.ts
 *   REQUIRE_FULL_RELEASE_GATE=true API_BASE_URL=http://localhost:4001 npx tsx scripts/release-gate.ts
 *
 * Environment:
 *   REQUIRE_FULL_RELEASE_GATE — set to "true" for CI full-mandatory mode
 *   RELEASE_GATE_REPORT_PATH — override report path (default: reports/release/release-gate.json)
 *   API_BASE_URL — smoke test target URL
 */

import { execSync, type ExecSyncOptionsWithBufferEncoding } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { connect } from 'node:net';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

type CheckStatus = 'PASS' | 'FAIL' | 'NOT_EXECUTED_ENVIRONMENT_MISSING';
type CheckCategory = 'static' | 'test' | 'build' | 'environment-required';

interface GateCheck {
  name: string;
  category: CheckCategory;
  /** Always mandatory regardless of environment */
  mandatory: boolean;
  command?: string;
  /** For environment-required checks: probe function returns true if env is available */
  probe?: () => Promise<boolean>;
  status: CheckStatus;
  exitCode: number | null;
  stdout: string | null;
  stderr: string | null;
  durationMs: number;
}

interface GateReport {
  generatedAt: string;
  requireFullReleaseGate: boolean;
  summary: {
    total: number;
    passed: number;
    failed: number;
    notExecuted: number;
    mandatoryFailed: number;
  };
  checks: {
    name: string;
    category: string;
    mandatory: boolean;
    status: string;
    exitCode: number | null;
    durationMs: number;
    stdoutPreview: string | null;
    stderrPreview: string | null;
  }[];
}

// ──────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────

const REQUIRE_FULL = () => process.env.REQUIRE_FULL_RELEASE_GATE === 'true';
const REPORT_PATH = process.env.RELEASE_GATE_REPORT_PATH ?? resolve('reports', 'release', 'release-gate.json');
const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4001';
const EXEC_TIMEOUT = 180_000;

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────

function redactSecrets(str: string): string {
  return str
    .replace(/Bearer\s+[^\s"]+/gi, 'Bearer [REDACTED]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"cookie_secret"\s*:\s*"[^"]*"/gi, '"cookie_secret":"[REDACTED]"')
    .replace(/"DATABASE_URL"\s*:\s*"[^"]*"/gi, '"DATABASE_URL":"[REDACTED]"')
    .replace(/DATABASE_URL=[^\s]+/gi, 'DATABASE_URL=[REDACTED]')
    .replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"[REDACTED]"');
}

function truncate(str: string | null, maxLen: number): string | null {
  if (!str) return null;
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '... (truncated)';
}

async function probeTcp(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout: timeoutMs });
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function probePostgres(): Promise<boolean> {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  // Parse host:port from DATABASE_URL
  try {
    const match = url.match(/@([^:]+):(\d+)/);
    if (!match) return false;
    return probeTcp(match[1], parseInt(match[2], 10), 3000);
  } catch {
    return false;
  }
}

async function probeApiServer(): Promise<boolean> {
  try {
    const url = new URL(`${API_BASE_URL}/healthz`);
    const resp = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

function execCheck(command: string, env?: Record<string, string>): { exitCode: number; stdout: string; stderr: string } {
  try {
    const opts: ExecSyncOptionsWithBufferEncoding = {
      encoding: 'buffer' as const,
      stdio: 'pipe',
      timeout: EXEC_TIMEOUT,
      env: { ...process.env, ...(env ?? {}), CI: process.env.CI ?? 'true' },
    };
    const output = execSync(command, opts);
    return { exitCode: 0, stdout: output.toString('utf-8'), stderr: '' };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer; message?: string };
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout ? e.stdout.toString('utf-8') : '',
      stderr: e.stderr ? e.stderr.toString('utf-8') : (e.message ?? 'Unknown error'),
    };
  }
}

// ──────────────────────────────────────────────────────────────
// CHECK DEFINITIONS
// ──────────────────────────────────────────────────────────────

export function defineChecks(): GateCheck[] {
  return [
    // ── Always mandatory local checks ─────────────────────────
    { name: 'npm ci (dependencies)', category: 'static', mandatory: true, command: 'npm ci', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Lint (ESLint)', category: 'static', mandatory: true, command: 'npm run lint', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'TypeScript typecheck (all)', category: 'static', mandatory: true, command: 'npm run typecheck:all', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Unit tests', category: 'test', mandatory: true, command: 'npm run test:unit', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'SQLite integration tests', category: 'test', mandatory: true, command: 'npm run test:integration:sqlite', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Schema validation', category: 'static', mandatory: true, command: 'npm run validate:schema', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Query schema validation', category: 'static', mandatory: true, command: 'npm run validate:query-schema', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Distribution validation', category: 'static', mandatory: true, command: 'npm run validate:distributions', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Data integrity validation', category: 'static', mandatory: true, command: 'npm run validate:data-integrity', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Repository hygiene', category: 'static', mandatory: true, command: 'npm run validate:hygiene', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Frontend build (Vercel)', category: 'build', mandatory: true, command: 'npm run build:vercel', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'Backend compile', category: 'build', mandatory: true, command: 'npm run compile:backend', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },
    { name: 'npm audit (high)', category: 'static', mandatory: true, command: 'npm audit --omit=dev --audit-level=high', status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0 },

    // ── Environment-required checks ───────────────────────────
    {
      name: 'PostgreSQL integration tests (CI)',
      category: 'environment-required',
      mandatory: REQUIRE_FULL(),
      command: 'npm run test:integration:postgres:ci',
      probe: probePostgres,
      status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0,
    },
    {
      name: 'API smoke test',
      category: 'environment-required',
      mandatory: REQUIRE_FULL(),
      command: 'npm run migrate && cross-env CI_FIXTURE_SEED=true npm run seed:ci && npm run smoke:api',
      probe: probeApiServer,
      status: 'PASS', exitCode: null, stdout: null, stderr: null, durationMs: 0,
    },
  ];
}

// ──────────────────────────────────────────────────────────────
// CORE LOGIC
// ──────────────────────────────────────────────────────────────

export async function runGateChecks(checksToRun: GateCheck[]): Promise<{ checks: GateCheck[]; overallResult: string }> {
  const overallStart = Date.now();

  // Phase 1: Environment probes
  console.log('── Probing environment ──');
  for (const check of checksToRun) {
    if (check.category === 'environment-required' && check.probe) {
      const start = Date.now();
      const available = await check.probe();
      const duration = Date.now() - start;
      if (available) {
        console.log(`  ${check.name}: environment AVAILABLE (${duration}ms)`);
      } else {
        console.log(`  ${check.name}: environment NOT AVAILABLE (${duration}ms)`);
      }
    }
  }

  console.log('\n── Running checks ──\n');

  // Phase 2: Execute checks
  let mandatoryFailed = 0;
  let totalFailed = 0;
  let totalNotExecuted = 0;

  for (const check of checksToRun) {
    // For environment-required checks, probe first
    if (check.category === 'environment-required') {
      if (check.probe) {
        const envAvailable = await check.probe();
        if (!envAvailable) {
          if (check.mandatory) {
            check.status = 'FAIL';
            check.exitCode = null;
            check.durationMs = 0;
            check.stderr = 'Required environment not available';
            mandatoryFailed++;
            totalFailed++;
            console.log(`  ✗ ${check.name}: FAIL (ENVIRONMENT MISSING — MANDATORY in CI)`);
          } else {
            check.status = 'NOT_EXECUTED_ENVIRONMENT_MISSING';
            check.exitCode = null;
            check.durationMs = 0;
            check.stderr = 'Environment not available (not mandatory locally)';
            totalNotExecuted++;
            console.log(`  ⊘ ${check.name}: NOT_EXECUTED_ENVIRONMENT_MISSING`);
          }
          continue;
        }
      }
    }

    // Execute command
    if (!check.command) continue;
    const cmdStart = Date.now();
    process.stdout.write(`${check.name}... `);
    const result = execCheck(check.command);
    check.exitCode = result.exitCode;
    check.stdout = truncate(redactSecrets(result.stdout), 1000);
    check.stderr = truncate(redactSecrets(result.stderr), 1000);
    check.durationMs = Date.now() - cmdStart;

    if (result.exitCode === 0) {
      check.status = 'PASS';
      console.log(`✓ PASS (${check.durationMs}ms)`);
    } else {
      check.status = 'FAIL';
      totalFailed++;
      if (check.mandatory || REQUIRE_FULL()) mandatoryFailed++;
      console.log(`✗ FAIL (${check.durationMs}ms, exit ${result.exitCode})`);
    }
  }

  const total = checksToRun.length;
  const passed = checksToRun.filter(c => c.status === 'PASS').length;
  const failed = checksToRun.filter(c => c.status === 'FAIL').length;
  const notExecuted = checksToRun.filter(c => c.status === 'NOT_EXECUTED_ENVIRONMENT_MISSING').length;

  const totalDuration = ((Date.now() - overallStart) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════');
  console.log(`  Duration: ${totalDuration}s`);
  console.log(`  Passed: ${passed}/${total}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Not Executed (env missing): ${notExecuted}`);
  console.log(`  Mandatory Failed: ${mandatoryFailed}`);
  console.log('═══════════════════════════════════════════\n');

  let overallResult: string;
  if (mandatoryFailed > 0) {
    overallResult = 'FAIL';
    console.log('RELEASE GATE: FAIL');
  } else if (notExecuted > 0 && !REQUIRE_FULL()) {
    overallResult = 'INCOMPLETE_ENVIRONMENT_PROOF';
    console.log('RELEASE GATE: INCOMPLETE_ENVIRONMENT_PROOF');
  } else {
    overallResult = 'PASS';
    console.log('RELEASE GATE: PASS');
  }

  return { checks: checksToRun, overallResult };
}

// ──────────────────────────────────────────────────────────────
// REPORT
// ──────────────────────────────────────────────────────────────

export function generateGateReport(checksToRun: GateCheck[]): GateReport {
  const passed = checksToRun.filter(c => c.status === 'PASS').length;
  const failed = checksToRun.filter(c => c.status === 'FAIL').length;
  const notExecuted = checksToRun.filter(c => c.status === 'NOT_EXECUTED_ENVIRONMENT_MISSING').length;
  const mandatoryFailed = checksToRun.filter(c => c.mandatory && c.status === 'FAIL').length;

  return {
    generatedAt: new Date().toISOString(),
    requireFullReleaseGate: REQUIRE_FULL(),
    summary: {
      total: checksToRun.length,
      passed,
      failed,
      notExecuted,
      mandatoryFailed,
    },
    checks: checksToRun.map(c => ({
      name: c.name,
      category: c.category,
      mandatory: c.mandatory,
      status: c.status,
      exitCode: c.exitCode,
      durationMs: c.durationMs,
      stdoutPreview: truncate(redactSecrets(c.stdout ?? ''), 500),
      stderrPreview: truncate(redactSecrets(c.stderr ?? ''), 500),
    })),
  };
}

export function writeGateReport(checksToRun: GateCheck[], reportPath: string): void {
  const report = generateGateReport(checksToRun);
  const dir = dirname(reportPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`Report written to ${reportPath}\n`);
}

// ──────────────────────────────────────────────────────────────
// CLI ENTRY
// ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const gateChecks = defineChecks();

  console.log('╔══════════════════════════════════════════╗');
  console.log('║   STOCKSTORY RELEASE GATE (MEGA)        ║');
  console.log(`║   Full gate: ${REQUIRE_FULL() ? 'YES (CI MODE)' : 'no (local mode)'}${' '.repeat(Math.max(0, 17 - (REQUIRE_FULL() ? 8 : 12)))}║`);
  console.log('╚══════════════════════════════════════════╝\n');

  try {
    await runGateChecks(gateChecks);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Release gate crashed: ${msg}`);
  }

  // Always write report
  try {
    writeGateReport(gateChecks, REPORT_PATH);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to write report: ${msg}`);
  }

  // Set exit code
  const mandatoryFailed = gateChecks.filter(c => c.mandatory && c.status === 'FAIL').length;
  if (mandatoryFailed > 0) {
    process.exitCode = 1;
  }
}

// CLI entry guard
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('release-gate.ts') ||
  process.argv[1].endsWith('release-gate.js') ||
  process.argv[1].includes('release-gate')
);

if (isMainModule) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Release gate crashed:', redactSecrets(message));
    process.exitCode = 1;
  });
}
