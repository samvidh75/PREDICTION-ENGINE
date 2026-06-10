/**
 * TRACK-SMOKE-MEGA — Strict API Smoke Test Script
 *
 * Validates production endpoints against exact contracts per docs/api-smoke-contract.md.
 *
 * Features:
 * - Typed check definitions with GET/POST support
 * - Request bodies, custom headers
 * - Exact HTTP status, application/json Content-Type, required JSON fields
 * - Custom assertion callbacks
 * - Mandatory vs diagnostic classification
 * - Machine-readable JSON report written to reports/release/api-smoke-report.json
 * - process.exitCode (never process.exit())
 * - CLI entry guard: core logic importable without auto-execution
 *
 * Environment:
 *   API_BASE_URL     — backend base URL (default: http://localhost:4001)
 *   SMOKE_REPORT_PATH — report output path (default: reports/release/api-smoke-report.json)
 *   SMOKE_TIMEOUT_MS  — fetch timeout in ms (default: 10000)
 *
 * Usage:
 *   npx tsx scripts/smoke-test-api.ts
 *   API_BASE_URL=http://localhost:4001 npx tsx scripts/smoke-test-api.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// ──────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST';

interface SmokeCheck {
  name: string;
  endpoint: string;
  method: HttpMethod;
  mandatory: boolean;
  exactStatus: number;
  requiredFields: string[];
  /** If provided, sends this as JSON request body */
  body?: unknown;
  /** Extra headers beyond default Accept */
  headers?: Record<string, string>;
  /** Custom assertions after status/JSON/fields pass. Return null if ok, error string if failed. */
  assert?: (body: Record<string, unknown>, status: number) => string | null;
}

interface SmokeCheckResult {
  name: string;
  method: HttpMethod;
  endpoint: string;
  mandatory: boolean;
  expectedStatus: number;
  actualStatus: number | null;
  contentType: string | null;
  passed: boolean;
  durationMs: number;
  error: string | null;
}

interface SmokeReport {
  generatedAt: string;
  baseUrl: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    mandatoryFailed: number;
    diagnosticFailed: number;
  };
  checks: SmokeCheckResult[];
}

// ──────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4001';
const REPORT_PATH = process.env.SMOKE_REPORT_PATH ?? resolve('reports', 'release', 'api-smoke-report.json');
const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS ?? '10000', 10);

// ──────────────────────────────────────────────────────────────
// CHECK DEFINITIONS
// ──────────────────────────────────────────────────────────────

export const checks: SmokeCheck[] = [
  // ── 2A. Liveness ────────────────────────────────────────────
  {
    name: 'GET /healthz — liveness',
    endpoint: '/healthz',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['ok', 'service'],
    assert: (body) => {
      if (body.ok !== true) return 'body.ok is not true';
      if (typeof body.service !== 'string' || body.service.length === 0) return 'body.service is empty';
      return null;
    },
  },

  // ── 2B. Readiness ──────────────────────────────────────────
  {
    name: 'GET /readyz — readiness with PostgreSQL',
    endpoint: '/readyz',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['ok', 'database', 'migrations'],
    assert: (body) => {
      const db = body.database as Record<string, unknown> | undefined;
      if (!db) return 'database object missing';
      if (db.kind !== 'postgres') return `database.kind is "${db.kind}", expected "postgres"`;
      if (db.fallbackUsed !== false) return 'database.fallbackUsed is true, expected false';
      const mig = body.migrations as Record<string, unknown> | undefined;
      if (mig && mig.checksumMismatch === true) return 'migrations.checksumMismatch is true';
      if (body.ok !== true) return 'body.ok is not true';
      return null;
    },
  },

  // ── 2C. Canonical StockStory fixture ────────────────────────
  {
    name: 'GET /api/stockstory/TESTIT?horizon=30',
    endpoint: '/api/stockstory/TESTIT?horizon=30',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['symbol', 'rankingScore'],
    assert: (body) => {
      if (body.symbol !== 'TESTIT') return `symbol is "${body.symbol}", expected "TESTIT"`;
      return null;
    },
  },

  // ── 2D. Unknown StockStory symbol ───────────────────────────
  {
    name: 'GET /api/stockstory/UNKNOWNTEST?horizon=30',
    endpoint: '/api/stockstory/UNKNOWNTEST?horizon=30',
    method: 'GET',
    mandatory: true,
    exactStatus: 404,
    requiredFields: ['code'],
    assert: (body) => {
      if (body.code !== 'SYMBOL_NOT_IN_UNIVERSE') return `code is "${body.code}", expected "SYMBOL_NOT_IN_UNIVERSE"`;
      return null;
    },
  },

  // ── 2E. Prediction signals ─────────────────────────────────
  {
    name: 'GET /api/predictions/signals?limit=5',
    endpoint: '/api/predictions/signals?limit=5',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['signals', 'generatedAt'],
  },

  // ── 2F. Prediction explanation ─────────────────────────────
  {
    name: 'GET /api/predictions/explain/TESTIT',
    endpoint: '/api/predictions/explain/TESTIT',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['symbol'],
    assert: (body) => {
      if (body.symbol !== 'TESTIT') return `symbol is "${body.symbol}", expected "TESTIT"`;
      return null;
    },
  },

  // ── 2G. Company intelligence ───────────────────────────────
  {
    name: 'GET /api/intelligence/company/TESTIT',
    endpoint: '/api/intelligence/company/TESTIT',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['symbol'],
    assert: (body) => {
      // Symbol may be at top level or nested in a payload/data envelope
      const sym = (body.symbol ?? (body as Record<string, unknown>).data as Record<string, unknown> | undefined) as string | undefined;
      if (!sym && !body.symbol) return 'no symbol field found in response';
      const symbolStr = String(body.symbol || '');
      if (symbolStr !== 'TESTIT') return `symbol is "${symbolStr}", expected "TESTIT"`;
      return null;
    },
  },

  // ── 2H. Empty portfolio intelligence (POST) ─────────────────
  {
    name: 'POST /api/intelligence/portfolio (empty)',
    endpoint: '/api/intelligence/portfolio',
    method: 'POST',
    mandatory: true,
    exactStatus: 200,
    requiredFields: [],
    body: { positions: [] },
    headers: { 'Content-Type': 'application/json' },
    assert: (body) => {
      // Must not contain demo or synthetic holdings
      const bodyStr = JSON.stringify(body).toLowerCase();
      if (bodyStr.includes('reliance') || bodyStr.includes('tcs') || bodyStr.includes('infy') || bodyStr.includes('hdfcbank') || bodyStr.includes('hal')) {
        return 'empty portfolio response contains demo/synthetic ticker symbols';
      }
      if (body.holdingsCount !== undefined && body.holdingsCount !== 0) {
        return `holdingsCount is ${body.holdingsCount}, expected 0`;
      }
      return null;
    },
  },

  // ── 2I. Missing-token user profile ─────────────────────────
  {
    name: 'GET /api/user/profile (no auth)',
    endpoint: '/api/user/profile',
    method: 'GET',
    mandatory: true,
    exactStatus: 401,
    requiredFields: ['code'],
    assert: (body) => {
      if (body.code !== 'AUTH_MISSING') return `code is "${body.code}", expected "AUTH_MISSING"`;
      return null;
    },
  },

  // ── 2J. Missing-token investor state ───────────────────────
  {
    name: 'GET /api/investor-state (no auth)',
    endpoint: '/api/investor-state',
    method: 'GET',
    mandatory: true,
    exactStatus: 401,
    requiredFields: ['code'],
    assert: (body) => {
      if (body.code !== 'AUTH_MISSING') return `code is "${body.code}", expected "AUTH_MISSING"`;
      return null;
    },
  },

  // ── 2K. Missing-token watchlists ───────────────────────────
  {
    name: 'GET /api/watchlists (no auth)',
    endpoint: '/api/watchlists',
    method: 'GET',
    mandatory: true,
    exactStatus: 401,
    requiredFields: ['code'],
    assert: (body) => {
      if (body.code !== 'AUTH_MISSING') return `code is "${body.code}", expected "AUTH_MISSING"`;
      return null;
    },
  },

  // ── 2L. Invalid method handling ────────────────────────────
  {
    name: 'POST /healthz — invalid method',
    endpoint: '/healthz',
    method: 'POST',
    mandatory: true,
    exactStatus: 0, // special: 404 or 405 accepted
    requiredFields: [],
    assert: (_body, status) => {
      if (status !== 404 && status !== 405) return `expected 404 or 405, got ${status}`;
      return null;
    },
  },

  // ── 2M. Malformed JSON handling ────────────────────────────
  {
    name: 'POST /api/intelligence/portfolio — malformed JSON',
    endpoint: '/api/intelligence/portfolio',
    method: 'POST',
    mandatory: true,
    exactStatus: 400,
    requiredFields: [],
    body: '{not-valid-json',
    headers: { 'Content-Type': 'application/json' },
  },

  // ── Diagnostic: Public plans ───────────────────────────────
  {
    name: 'GET /api/plans — diagnostic',
    endpoint: '/api/plans',
    method: 'GET',
    mandatory: false,
    exactStatus: 200,
    requiredFields: [],
  },
];

// ──────────────────────────────────────────────────────────────
// CORE LOGIC (importable)
// ──────────────────────────────────────────────────────────────

function hasFields(obj: unknown, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return fields.length === 0;
  const record = obj as Record<string, unknown>;
  const isEnvelope = typeof record.status === 'string' && 'data' in record;
  const dataObj = (isEnvelope && record.data && typeof record.data === 'object')
    ? (record.data as Record<string, unknown>)
    : null;

  for (const field of fields) {
    const existsAtRoot = field in record;
    const existsInData = dataObj ? (field in dataObj) : false;

    if (!existsAtRoot && !existsInData) {
      if (isEnvelope && (record.status === 'empty' || record.status === 'unavailable') && field === 'signals') {
        continue;
      }
      return false;
    }
  }
  return true;
}

function redactSecrets(str: string): string {
  return str
    .replace(/Bearer\s+[^\s"]+/gi, 'Bearer [REDACTED]')
    .replace(/"password"\s*:\s*"[^"]*"/gi, '"password":"[REDACTED]"')
    .replace(/"cookie_secret"\s*:\s*"[^"]*"/gi, '"cookie_secret":"[REDACTED]"')
    .replace(/"secret"\s*:\s*"[^"]*"/gi, '"secret":"[REDACTED]"');
}

export function generateReport(results: SmokeCheckResult[], baseUrl: string): SmokeReport {
  const mandatoryFailed = results.filter((r) => r.mandatory && !r.passed).length;
  const diagnosticFailed = results.filter((r) => !r.mandatory && !r.passed).length;
  const passed = results.filter((r) => r.passed).length;

  return {
    generatedAt: new Date().toISOString(),
    baseUrl,
    summary: {
      total: results.length,
      passed,
      failed: results.length - passed,
      mandatoryFailed,
      diagnosticFailed,
    },
    checks: results,
  };
}

export async function runSmokeChecks(
  checksToRun: SmokeCheck[],
  baseUrl: string,
  timeoutMs: number,
): Promise<SmokeCheckResult[]> {
  const results: SmokeCheckResult[] = [];

  for (const check of checksToRun) {
    const start = Date.now();
    const result: SmokeCheckResult = {
      name: check.name,
      method: check.method,
      endpoint: check.endpoint,
      mandatory: check.mandatory,
      expectedStatus: check.exactStatus,
      actualStatus: null,
      contentType: null,
      passed: false,
      durationMs: 0,
      error: null,
    };

    try {
      const fetchInit: RequestInit & { signal?: AbortSignal } = {
        method: check.method,
        headers: {
          Accept: 'application/json',
          ...(check.headers ?? {}),
        },
        signal: AbortSignal.timeout(timeoutMs),
      };

      if (check.body !== undefined) {
        // For malformed JSON test, send raw string body
        if (typeof check.body === 'string') {
          (fetchInit as Record<string, unknown>).body = check.body;
        } else {
          (fetchInit as Record<string, unknown>).body = JSON.stringify(check.body);
        }
      }

      const url = `${baseUrl}${check.endpoint}`;
      const response = await fetch(url, fetchInit);

      result.actualStatus = response.status;
      result.contentType = response.headers.get('content-type') ?? null;
      result.durationMs = Date.now() - start;

      // Special case: invalid method check accepts 404 or 405
      if (check.exactStatus === 0) {
        // Use the assert callback to validate status
        const assertErr = check.assert ? check.assert({} as Record<string, unknown>, response.status) : null;
        if (assertErr) {
          result.error = redactSecrets(assertErr);
          result.passed = false;
        } else {
          result.expectedStatus = response.status; // record whichever valid status
          result.passed = true;
        }
        results.push(result);
        continue;
      }

      // 1. Exact status code
      if (response.status !== check.exactStatus) {
        result.error = `Expected HTTP ${check.exactStatus}, got ${response.status}`;
        results.push(result);
        continue;
      }

      // 2. Must be JSON (unless body is empty and no required fields)
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        result.error = `Expected application/json, got ${contentType || 'none'}`;
        results.push(result);
        continue;
      }

      // 3. Parse body
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        result.error = 'Response body is not valid JSON';
        results.push(result);
        continue;
      }

const bodyRecord = body as Record<string, unknown>;
      const isEnvelope = typeof bodyRecord.status === 'string' && 'data' in bodyRecord;
      const combinedRecord = (isEnvelope && bodyRecord.data && typeof bodyRecord.data === 'object')
        ? { ...bodyRecord, ...(bodyRecord.data as Record<string, unknown>) }
        : bodyRecord;

      // 4. Required fields
      if (check.requiredFields.length > 0 && !hasFields(body, check.requiredFields)) {
        const missing = check.requiredFields.filter(
          (f) => !(f in combinedRecord),
        );
        result.error = `Missing required fields: ${missing.join(', ')}`;
        results.push(result);
        continue;
      }

      // 5. Custom assertions
      if (check.assert) {
        const assertErr = check.assert(combinedRecord, response.status);
        if (assertErr) {
          result.error = redactSecrets(assertErr);
          results.push(result);
          continue;
        }
      }

      result.passed = true;
      results.push(result);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string; name?: string };
      result.durationMs = Date.now() - start;
      result.error = redactSecrets(
        (e.name === 'TimeoutError' || e.code === 'ETIMEDOUT')
          ? `Request timed out after ${timeoutMs}ms`
          : (e.message?.slice(0, 200) || 'Unknown network error'),
      );
      results.push(result);
    }
  }

  return results;
}

// ──────────────────────────────────────────────────────────────
// TERMINAL OUTPUT
// ──────────────────────────────────────────────────────────────

function printResults(results: SmokeCheckResult[], baseUrl: string): void {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   STOCKSTORY API SMOKE (STRICT-MEGA)    ║');
  console.log(`║   Base: ${baseUrl}${' '.repeat(Math.max(0, 34 - baseUrl.length))}║`);
  console.log('╚══════════════════════════════════════════╝\n');

  for (const r of results) {
    const icon = r.passed ? '✓' : '✗';
    const tag = r.mandatory ? '[MANDATORY]' : '[DIAGNOSTIC]';
    const statusStr = r.actualStatus !== null ? String(r.actualStatus) : '—';
    const durationStr = `${r.durationMs}ms`.padStart(6);
    const errStr = r.error ? ` — ${r.error}` : '';

    console.log(`  ${icon} ${tag} ${r.name}`);
    if (!r.passed) {
      console.log(`    → expected ${r.expectedStatus}, got ${statusStr} (${durationStr})${errStr}`);
    } else {
      console.log(`    → ${statusStr} (${durationStr})`);
    }
  }

  const report = generateReport(results, baseUrl);
  const s = report.summary;
  console.log('\n═══════════════════════════════════════════');
  console.log(`  Total: ${s.total}  Passed: ${s.passed}  Failed: ${s.failed}`);
  console.log(`  Mandatory Failed: ${s.mandatoryFailed}  Diagnostic Failed: ${s.diagnosticFailed}`);
  console.log('═══════════════════════════════════════════\n');

  if (s.mandatoryFailed > 0) {
    console.log('SMOKE TEST: FAIL');
  } else {
    console.log('SMOKE TEST: PASS');
  }
}

// ──────────────────────────────────────────────────────────────
// REPORT WRITING
// ──────────────────────────────────────────────────────────────

function writeReport(results: SmokeCheckResult[], baseUrl: string, reportPath: string): void {
  const report = generateReport(results, baseUrl);
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
  const results = await runSmokeChecks(checks, BASE_URL, TIMEOUT_MS);
  printResults(results, BASE_URL);

  try {
    writeReport(results, BASE_URL, REPORT_PATH);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Failed to write report: ${msg}`);
  }

  const summary = generateReport(results, BASE_URL).summary;
  if (summary.mandatoryFailed > 0) {
    process.exitCode = 1;
  }
}

// Only run CLI when this is the main module
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('smoke-test-api.ts') ||
  process.argv[1].endsWith('smoke-test-api.js') ||
  process.argv[1].includes('smoke-test-api')
);

if (isMainModule) {
  main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Smoke test crashed:', redactSecrets(message));
    process.exitCode = 1;
  });
}
