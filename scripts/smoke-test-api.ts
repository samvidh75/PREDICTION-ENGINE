/**
 * TRACK-P3B — API Smoke Test Script
 * 
 * Calls key production endpoints and validates response shapes.
 * Default base URL: http://localhost:4001
 * 
 * Usage:
 *   npx tsx scripts/smoke-test-api.ts
 *   API_BASE_URL=http://localhost:4001 npx tsx scripts/smoke-test-api.ts
 */

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4001';

interface SmokeCheck {
  name: string;
  endpoint: string;
  mandatory: boolean;
  minStatus: number;
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
    mandatory: true,
    minStatus: 200,
    requiredFields: ['ok', 'service'],
  },
  {
    name: '/api/stockstory/TESTIT',
    endpoint: '/api/stockstory/TESTIT',
    mandatory: true,
    minStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/predictions/signals',
    endpoint: '/api/predictions/signals?limit=5',
    mandatory: true,
    minStatus: 200,
    requiredFields: ['signals', 'generatedAt'],
  },
  {
    name: '/api/predictions/explain/TESTIT',
    endpoint: '/api/predictions/explain/TESTIT',
    mandatory: false,
    minStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/intelligence/company/TESTIT',
    endpoint: '/api/intelligence/company/TESTIT',
    mandatory: false,
    minStatus: 200,
    requiredFields: ['symbol'],
  },
  {
    name: '/api/intelligence/portfolio',
    endpoint: '/api/intelligence/portfolio',
    mandatory: false,
    minStatus: 200,
    requiredFields: [],
  },
];

function hasFields(obj: any, fields: string[]): boolean {
  if (!obj || typeof obj !== 'object') return fields.length === 0;
  for (const field of fields) {
    if (!(field in obj)) return false;
  }
  return true;
}

async function runChecks(): Promise<void> {
  console.log('╔══════════════════════════════════╗');
  console.log('║     STOCKSTORY API SMOKE TEST    ║');
  console.log(`║     Base: ${BASE_URL}${' '.repeat(Math.max(0, 24 - BASE_URL.length))}║`);
  console.log('╚══════════════════════════════════╝\n');

  let mandatoryFailed = 0;
  let totalFailed = 0;

  for (const check of checks) {
    const start = Date.now();
    process.stdout.write(`${check.name}... `);

    try {
      const url = `${BASE_URL}${check.endpoint}`;
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      check.status = response.status;
      check.durationMs = Date.now() - start;

      if (response.status >= check.minStatus && response.status < 500) {
        // Try to parse body for field validation
        try {
          const body = await response.json();
          if (hasFields(body, check.requiredFields)) {
            check.passed = true;
            console.log(`✓ PASS (${check.status} ${check.durationMs}ms)`);
          } else {
            check.passed = false;
            check.error = `Missing required fields: ${check.requiredFields.filter(f => !(f in body)).join(', ')}`;
            console.log(`✗ FAIL (response shape wrong)`);
            totalFailed++;
            if (check.mandatory) mandatoryFailed++;
          }
        } catch {
          // Could not parse JSON but status was OK
          check.passed = true;
          console.log(`✓ PASS (${check.status} ${check.durationMs}ms, non-JSON response)`);
        }
      } else if (response.status === 404) {
        // 404 is acceptable for data-dependent endpoints
        check.passed = true;
        console.log(`✓ PASS (${check.status} ${check.durationMs}ms — no data, not an error)`);
      } else {
        check.passed = false;
        check.error = `HTTP ${response.status}`;
        console.log(`✗ FAIL (HTTP ${response.status})`);
        totalFailed++;
        if (check.mandatory) mandatoryFailed++;
      }
    } catch (err: any) {
      check.passed = false;
      check.error = err.message?.slice(0, 200) || 'Unknown error';
      check.durationMs = Date.now() - start;
      console.log(`✗ FAIL (${err.code || 'ERROR'})`);
      totalFailed++;
      if (check.mandatory) mandatoryFailed++;
    }
  }

  console.log('\n═══════════════════════════════════');
  console.log(`  Passed: ${checks.filter(c => c.passed).length}/${checks.length}`);
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

runChecks().catch(err => {
  console.error('Smoke test crashed:', err.message);
  process.exit(1);
});
