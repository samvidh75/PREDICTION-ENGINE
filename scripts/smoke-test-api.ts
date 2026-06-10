/**
 * TRACK-P4B — Strict API Smoke Test Script
 *
 * Validates production endpoints against exact contracts:
 * - Exact HTTP status codes (no range tolerance).
 * - JSON Content-Type required.
 * - Required fields must be present in response body.
 * - Negative auth checks: endpoints that require auth MUST return 401
 *   with code === "AUTH_MISSING" when no token is provided.
 * - Unknown symbol check: /api/stockstory/UNKNOWNTEST returns a
 *   documented status with a JSON envelope.
 * - /readyz validates database.kind === "postgres" and
 *   database.fallbackUsed === false.
 * - All production endpoints are mandatory (no arbitrary 404 acceptance).
 * - Writes a JSON report to reports/release/api-smoke-report.json.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-api.ts
 *   API_BASE_URL=http://localhost:4001 npx tsx scripts/smoke-test-api.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4001';
const REPORT_DIR = path.resolve('reports', 'release');
const REPORT_PATH = path.join(REPORT_DIR, 'api-smoke-report.json');

interface SmokeCheck {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  body?: string | null;
  contentType?: string;
  exactStatus: number;
  requiredFields: string[];
  validations?: string[];
  passed?: boolean;
  status?: number;
  error?: string;
  durationMs?: number;
}

interface SmokeReport {
  timestamp: string;
  baseUrl: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    mandatoryFailed: number;
    durationMs: number;
  };
  checks: SmokeCheck[];
  conclusion: 'PASS' | 'FAIL';
}

const checks: SmokeCheck[] = [
  // ── Infrastructure ──────────────────────────────────────────────
  {
    name: '/healthz',
    endpoint: '/healthz',
    method: 'GET',
    exactStatus: 200,
    requiredFields: ['ok', 'service'],
  },
  {
    name: '/readyz (postgres + no fallback)',
    endpoint: '/readyz',
    method: 'GET',
    exactStatus: 200,
    requiredFields: ['database'],
    validations: [
      'database.kind === "postgres"',
      'database.fallbackUsed === false',
    ],
  },

  // ── Public data endpoints ───────────────────────────────────────
  {
    name: '/api/stockstory/TESTIT',
    endpoint: '/api/stockstory/TESTIT',
    method: 'GET',
    exactStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/predictions/signals',
    endpoint: '/api/predictions/signals?limit=5',
    method: 'GET',
    exactStatus: 200,
    requiredFields: ['signals', 'generatedAt'],
  },

  // ── Unknown symbol — documented envelope ────────────────────────
  {
    name: '/api/stockstory/UNKNOWNTEST (unknown symbol)',
    endpoint: '/api/stockstory/UNKNOWNTEST',
    method: 'GET',
    exactStatus: 200,
    requiredFields: ['symbol'],
    validations: ['symbol === "UNKNOWNTEST"'],
  },

  // ── Intelligence endpoints ──────────────────────────────────────
  {
    name: '/api/intelligence/portfolio (POST)',
    endpoint: '/api/intelligence/portfolio',
    method: 'POST',
    body: JSON.stringify({ positions: [] }),
    contentType: 'application/json',
    exactStatus: 200,
    requiredFields: [],
  },

  // ── Negative auth checks ───────────────────────────────────────
  {
    name: '/api/user/profile (no token → 401)',
    endpoint: '/api/user/profile',
    method: 'GET',
    exactStatus: 401,
    requiredFields: ['code', 'error'],
    validations: ['code === "AUTH_MISSING"'],
  },
  {
    name: '/api/investor-state (no token → 401)',
    endpoint: '/api/investor-state',
    method: 'GET',
    exactStatus: 401,
    requiredFields: ['code', 'error'],
    validations: ['code === "AUTH_MISSING"'],
  },
];

function hasFields(obj: unknown, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return fields.length === 0;
  for (const field of fields) {
    if (!(field in (obj as Record<string, unknown>))) return false;
  }
  return true;
}

/**
 * Walks a dotted path into a JSON value (e.g. "database.kind" → obj.database.kind).
 * Returns `undefined` if any segment is missing.
 */
function deepGet(obj: unknown, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Evaluates a simple validation expression and returns a human-readable result.
 * Supported patterns:
 *   "field.deep.path === "value""
 *   "field.deep.path === false" / true / number
 */
function runValidation(body: Record<string, unknown>, expression: string): { ok: boolean; detail: string } {
  const match = expression.match(/^([\w.]+)\s*(===|!==)\s*(.+)$/);
  if (!match) {
    return { ok: false, detail: `unknown validation expression: "${expression}"` };
  }

  const [, fieldPath, operator, rawExpected] = match;

  let expected: unknown = rawExpected.trim();
  // Remove surrounding quotes for strings
  if (expected.startsWith('"') && expected.endsWith('"')) {
    expected = expected.slice(1, -1);
  } else if (expected === 'true') {
    expected = true;
  } else if (expected === 'false') {
    expected = false;
  } else if (!isNaN(Number(expected))) {
    expected = Number(expected);
  }

  const actual = deepGet(body, fieldPath);

  const ok = operator === '==='
    ? actual === expected
    : actual !== expected;

  const actualStr = typeof actual === 'string' ? `"${actual}"` : JSON.stringify(actual);
  const expectedStr = typeof expected === 'string' ? `"${expected}"` : JSON.stringify(expected);

  return {
    ok,
    detail: ok
      ? `${fieldPath} ${operator} ${expectedStr}`
      : `expected ${fieldPath} ${operator} ${expectedStr}, got ${actualStr}`,
  };
}

async function runChecks(): Promise<void> {
  console.log('╔══════════════════════════════════╗');
  console.log('║   STOCKSTORY API SMOKE (STRICT)  ║');
  console.log(
    `║   Base: ${BASE_URL}${' '.repeat(Math.max(0, 24 - BASE_URL.length))}║`,
  );
  console.log('╚══════════════════════════════════╝\n');

  let mandatoryFailed = 0;
  let totalFailed = 0;
  const suiteStart = Date.now();

  for (const check of checks) {
    const start = Date.now();
    process.stdout.write(`${check.name}... `);

    try {
      const url = `${BASE_URL}${check.endpoint}`;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (check.contentType) {
        headers['Content-Type'] = check.contentType;
      }

      const fetchInit: RequestInit = {
        method: check.method,
        headers,
        signal: AbortSignal.timeout(10000),
      };

      if (check.method === 'POST' && check.body !== undefined && check.body !== null) {
        fetchInit.body = check.body;
      }

      const response = await fetch(url, fetchInit);

      check.status = response.status;
      check.durationMs = Date.now() - start;

      // 1. Exact status code
      if (response.status !== check.exactStatus) {
        check.passed = false;
        check.error = `Expected HTTP ${check.exactStatus}, got ${response.status}`;
        console.log(
          `✗ FAIL (HTTP ${response.status}, expected ${check.exactStatus})`,
        );
        totalFailed++;
        mandatoryFailed++;
        continue;
      }

      // 2. Must be JSON
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        check.passed = false;
        check.error = `Expected application/json, got ${contentType}`;
        console.log(`✗ FAIL (not JSON: ${contentType})`);
        totalFailed++;
        mandatoryFailed++;
        continue;
      }

      // 3. Parse body and validate required fields
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        check.passed = false;
        check.error = 'Response body is not valid JSON';
        console.log('✗ FAIL (invalid JSON body)');
        totalFailed++;
        mandatoryFailed++;
        continue;
      }

      if (!hasFields(body, check.requiredFields)) {
        const missing = check.requiredFields.filter(
          (f) => !(f in (body as Record<string, unknown>)),
        );
        check.passed = false;
        check.error = `Missing required fields: ${missing.join(', ')}`;
        console.log(`✗ FAIL (missing fields: ${missing.join(', ')})`);
        totalFailed++;
        mandatoryFailed++;
        continue;
      }

      // 4. Run custom validations
      if (check.validations && check.validations.length > 0) {
        const bodyObj = body as Record<string, unknown>;
        for (const expression of check.validations) {
          const result = runValidation(bodyObj, expression);
          if (!result.ok) {
            check.passed = false;
            check.error = `Validation "${expression}" failed: ${result.detail}`;
            console.log(`✗ FAIL (${result.detail})`);
            totalFailed++;
            mandatoryFailed++;
            break;
          }
        }

        if (check.passed === false) continue;
      }

      check.passed = true;
      console.log(`✓ PASS (${check.status}, ${check.durationMs}ms)`);
    } catch (err: unknown) {
      check.passed = false;
      const e = err as { code?: string; message?: string };
      check.error = e.message?.slice(0, 200) || 'Unknown error';
      check.durationMs = Date.now() - start;
      console.log(`✗ FAIL (${e.code || 'NETWORK ERROR'})`);
      totalFailed++;
      mandatoryFailed++;
    }
  }

  const suiteDurationMs = Date.now() - suiteStart;
  const passedCount = checks.filter((c) => c.passed).length;

  console.log('\n═══════════════════════════════════');
  console.log(`  Passed: ${passedCount}/${checks.length}`);
  console.log(`  Total Failed: ${totalFailed}`);
  console.log(`  Mandatory Failed: ${mandatoryFailed}`);
  console.log('═══════════════════════════════════\n');

  // ── Write JSON report ───────────────────────────────────────────
  const report: SmokeReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: checks.length,
      passed: passedCount,
      failed: totalFailed,
      mandatoryFailed,
      durationMs: suiteDurationMs,
    },
    checks: checks.map(({ passed, error, status, durationMs, name, endpoint, method, exactStatus, requiredFields, validations }) => ({
      name,
      endpoint,
      method,
      exactStatus,
      requiredFields,
      validations,
      passed,
      status,
      error,
      durationMs,
    })),
    conclusion: mandatoryFailed === 0 ? 'PASS' : 'FAIL',
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  console.log(`Report written to ${REPORT_PATH}`);

  // ── Set exit code ───────────────────────────────────────────────
  if (mandatoryFailed > 0) {
    console.log('SMOKE TEST: FAIL');
    process.exitCode = 1;
  } else {
    console.log('SMOKE TEST: PASS');
    process.exitCode = 0;
  }
}

runChecks().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Smoke test crashed:', message);

  // Still write a report for the crash
  const report: SmokeReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      total: checks.length,
      passed: 0,
      failed: checks.length,
      mandatoryFailed: checks.length,
      durationMs: 0,
    },
    checks: checks.map((c) => ({
      name: c.name,
      endpoint: c.endpoint,
      method: c.method,
      exactStatus: c.exactStatus,
      requiredFields: c.requiredFields,
      validations: c.validations,
      passed: false,
      error: 'Smoke test runner crashed before completion',
    })),
    conclusion: 'FAIL',
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf-8');

  process.exitCode = 1;
});