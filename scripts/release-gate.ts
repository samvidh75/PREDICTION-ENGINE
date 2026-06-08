/**
 * TRACK-P3B — Release Gate (Updated)
 * 
 * Runs all mandatory verification checks. Fails with non-zero exit code
 * if any mandatory check fails.
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
  { name: 'Lint (ESLint)', mandatory: true, command: 'npx eslint . --max-warnings=0', passed: false },
  { name: 'TypeScript typecheck (all)', mandatory: true, command: 'npx tsc -p tsconfig.all.json --noEmit', passed: false },
  { name: 'Unit tests', mandatory: true, command: 'npx vitest run', passed: false },
  { name: 'SQLite integration tests', mandatory: true, command: 'cross-env DB_ADAPTER=sqlite npx vitest run', passed: false },
  { name: 'Coverage', mandatory: true, command: 'npx vitest run --coverage', passed: false },
  { name: 'Schema validation', mandatory: true, command: 'npx tsx scripts/validate-schema-contract.ts', passed: false },
  { name: 'Distribution validation', mandatory: true, command: 'npx tsx scripts/validate-sector-distributions.ts', passed: false },
  { name: 'Data integrity validation', mandatory: true, command: 'npx tsx scripts/validate-data-integrity.ts', passed: false },
  { name: 'Repository hygiene', mandatory: true, command: 'npx tsx scripts/validate-repository-hygiene.ts', passed: false },
  { name: 'Frontend build', mandatory: true, command: 'npx vite build', passed: false },
  { name: 'Backend compile', mandatory: true, command: 'npx tsc -p tsconfig.backend.emit.json', passed: false },
  { name: 'Dependency audit', mandatory: true, command: 'npm audit --omit=dev --audit-level=high', passed: false },
];

const startTime = Date.now();

console.log('╔══════════════════════════════════════════╗');
console.log('║     STOCKSTORY RELEASE GATE (P3B)       ║');
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
      timeout: 120_000,
      env: { ...process.env, CI: 'true' },
    });
    check.passed = true;
    check.durationMs = Date.now() - checkStart;
    console.log(`✓ PASS (${check.durationMs}ms)`);
  } catch (err: any) {
    check.passed = false;
    check.error = err.stderr?.toString()?.slice(0, 300) || err.message?.slice(0, 300) || 'Unknown error';
    check.durationMs = Date.now() - checkStart;
    
    if (check.mandatory) {
      mandatoryFailed++;
      console.log(`✗ FAIL (MANDATORY)`);
    } else {
      console.log(`⚠ WARN`);
    }
    totalFailed++;
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n═══════════════════════════════════════════');
console.log(`  Duration: ${totalDuration}s`);
console.log(`  Passed: ${checks.filter(c => c.passed).length}/${checks.length}`);
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
