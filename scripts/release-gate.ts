/**
 * TRACK-P4B — Release Gate (Truthful)
 *
 * Reflects the actual mandatory checks enforced by CI workflows.
 * Each check maps to a real package.json script that CI runs.
 *
 * Usage: npx tsx scripts/release-gate.ts
 */

import { execSync } from 'child_process';

interface GateCheck {
  name: string;
  mandatory: boolean;
  command: string;
  passed: boolean;
  error?: string;
  durationMs?: number;
}

const checks: GateCheck[] = [
  { name: 'npm ci (dependencies)', mandatory: true, command: 'npm ci', passed: false },
  { name: 'Lint (ESLint)', mandatory: true, command: 'npm run lint', passed: false },
  { name: 'TypeScript typecheck (all)', mandatory: true, command: 'npm run typecheck:all', passed: false },
  { name: 'Unit tests', mandatory: true, command: 'npm run test:unit', passed: false },
  { name: 'SQLite integration tests', mandatory: true, command: 'npm run test:integration:sqlite', passed: false },
  { name: 'PostgreSQL integration tests (CI)', mandatory: true, command: 'npm run test:integration:postgres:ci', passed: false },
  { name: 'Schema validation', mandatory: true, command: 'npm run validate:schema', passed: false },
  { name: 'Distribution validation', mandatory: true, command: 'npm run validate:distributions', passed: false },
  { name: 'Data integrity validation', mandatory: true, command: 'npm run validate:data-integrity', passed: false },
  { name: 'Repository hygiene', mandatory: true, command: 'npm run validate:hygiene', passed: false },
  { name: 'Frontend build (Vercel)', mandatory: true, command: 'npm run build:vercel', passed: false },
  { name: 'Backend compile', mandatory: true, command: 'npm run compile:backend', passed: false },
  { name: 'API smoke test', mandatory: true, command: 'npm run smoke:api', passed: false },
];

const startTime = Date.now();

console.log('╔══════════════════════════════════════════╗');
console.log('║     STOCKSTORY RELEASE GATE (P4B)       ║');
console.log('╚══════════════════════════════════════════╝\n');

let mandatoryFailed = 0;
let totalFailed = 0;

for (const check of checks) {
  const checkStart = Date.now();
  process.stdout.write(`${check.name}... `);

  try {
    execSync(check.command, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 180_000,
      env: { ...process.env, CI: 'true' },
    });
    check.passed = true;
    check.durationMs = Date.now() - checkStart;
    console.log(`✓ PASS (${check.durationMs}ms)`);
  } catch (err: unknown) {
    check.passed = false;
    const e = err as { stderr?: string; message?: string };
    check.error = e.stderr?.toString()?.slice(0, 300) || e.message?.slice(0, 300) || 'Unknown error';
    check.durationMs = Date.now() - checkStart;

    if (check.mandatory) {
      mandatoryFailed++;
      console.log('✗ FAIL (MANDATORY)');
    } else {
      console.log('⚠ WARN');
    }
    totalFailed++;
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n═══════════════════════════════════════════');
console.log(`  Duration: ${totalDuration}s`);
console.log(`  Passed: ${checks.filter((c) => c.passed).length}/${checks.length}`);
console.log(`  Failed: ${totalFailed} (${mandatoryFailed} mandatory)`);
console.log('═══════════════════════════════════════════\n');

if (mandatoryFailed > 0) {
  console.log('FAILED CHECKS:');
  for (const check of checks) {
    if (!check.passed && check.mandatory) {
      console.log(`\n  [MANDATORY] ${check.name}`);
      if (check.error) console.log(`  Error: ${check.error}`);
    }
  }
  console.log(`\nRELEASE GATE: FAIL (${mandatoryFailed} mandatory check(s) failed)`);
  process.exit(1);
} else {
  console.log('\nRELEASE GATE: PASS');
  process.exit(0);
}
