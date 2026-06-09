/**
 * TRACK-P4B — Strict API Smoke Test Script
 *
 * Validates production endpoints against exact contracts:
 * - Exact HTTP status codes (no range tolerance).
 * - JSON Content-Type required.
 * - Required fields must be present in response body.
 * - 404 is NOT a pass for mandatory endpoints.
 * - Non-mandatory endpoints failing do not block CI but are reported.
 *
 * Usage:
 *   npx tsx scripts/smoke-test-api.ts
 *   API_BASE_URL=http://localhost:4001 npx tsx scripts/smoke-test-api.ts
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4001';

interface SmokeCheck {
  name: string;
  endpoint: string;
  method: 'GET' | 'POST';
  mandatory: boolean;
  exactStatus: number;
  requiredFields: string[];
  passed?: boolean;
  status?: number;
  error?: string;
  durationMs?: number;
}

const checks: SmokeCheck[] = [
  {
    name: '/healthz',
    endpoint: '/healthz',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['ok', 'service'],
  },
  {
    name: '/readyz',
    endpoint: '/readyz',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['database'],
  },
  {
    name: '/api/stockstory/TESTIT',
    endpoint: '/api/stockstory/TESTIT',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/predictions/signals',
    endpoint: '/api/predictions/signals?limit=5',
    method: 'GET',
    mandatory: true,
    exactStatus: 200,
    requiredFields: ['signals', 'generatedAt'],
  },
  {
    name: '/api/predictions/explain/TESTIT',
    endpoint: '/api/predictions/explain/TESTIT',
    method: 'GET',
    mandatory: false,
    exactStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/intelligence/company/TESTIT',
    endpoint: '/api/intelligence/company/TESTIT',
    method: 'GET',
    mandatory: false,
    exactStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/intelligence/portfolio',
    endpoint: '/api/intelligence/portfolio',
    method: 'GET',
    mandatory: false,
    exactStatus: 200,
    requiredFields: [],
  },
];

function hasFields(obj: unknown, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return fields.length === 0;
  for (const field of fields) {
    if (!(field in (obj as Record<string, unknown>))) return false;
  }
  return true;
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

  for (const check of checks) {
    const start = Date.now();
    process.stdout.write(`${check.name}... `);

    try {
      const url = `${BASE_URL}${check.endpoint}`;
      const response = await fetch(url, {
        method: check.method,
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10000),
      });

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
        if (check.mandatory) mandatoryFailed++;
        continue;
      }

      // 2. Must be JSON
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.includes('application/json')) {
        check.passed = false;
        check.error = `Expected application/json, got ${contentType}`;
        console.log(`✗ FAIL (not JSON: ${contentType})`);
        totalFailed++;
        if (check.mandatory) mandatoryFailed++;
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
        if (check.mandatory) mandatoryFailed++;
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
        if (check.mandatory) mandatoryFailed++;
        continue;
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
      if (check.mandatory) mandatoryFailed++;
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log(
    `  Passed: ${checks.filter((c) => c.passed).length}/${checks.length}`,
  );
  console.log(`  Total Failed: ${totalFailed}`);
  console.log(`  Mandatory Failed: ${mandatoryFailed}`);
  console.log('═══════════════════════════════════\n');

  if (mandatoryFailed > 0) {
    console.log('SMOKE TEST: FAIL');
    process.exit(1);
  } else {
    console.log('SMOKE TEST: PASS');
    process.exit(0);
  }
}

runChecks().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('Smoke test crashed:', message);
  process.exit(1);
});
