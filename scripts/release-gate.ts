/**
 * TRACK-P3 — Release Gate
 * 
 * Runs all mandatory verification checks and fails with non-zero exit
 * if any mandatory check fails.
 * 
 * Usage: npx tsx scripts/release-gate.ts
 * Alias:  npm run release:gate
 */

import { execSync } from 'child_process';

interface GateCheck {
  name: string;
  mandatory: boolean;
  command: string;
  passed: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
}

const checks: GateCheck[] = [
  { name: 'npm ci (dependencies)', mandatory: true, command: 'npm ci', passed: false },
  { name: 'TypeScript typecheck (all)', mandatory: true, command: 'npx tsc -p tsconfig.all.json --noEmit', passed: false },
  { name: 'Unit tests', mandatory: true, command: 'npx vitest run', passed: false },
  { name: 'SQLite integration tests', mandatory: true, command: 'npx vitest run', passed: false },
  { name: 'Frontend build', mandatory: true, command: 'npx vite build', passed: false },
  { name: 'Backend typecheck', mandatory: true, command: 'npx tsc -p tsconfig.backend.json --noEmit', passed: false },
  { name: 'Backend compile', mandatory: true, command: 'npx tsc -p tsconfig.backend.emit.json', passed: false },
  { name: 'Schema validation', mandatory: true, command: 'npx tsx scripts/validate-schema-contract.ts', passed: false },
  { name: 'Distribution validation', mandatory: true, command: 'npx tsx scripts/validate-sector-distributions.ts', passed: false },
  { name: 'Repository hygiene', mandatory: false, command: 'npx tsx scripts/validate-repository-hygiene.ts', passed: false },
];

const startTime = Date.now();

console.log('╔══════════════════════════════════════════╗');
console.log('║     STOCKSTORY RELEASE GATE             ║');
console.log('║     TRACK-P3 — CI Hardening             ║');
console.log('╚══════════════════════════════════════════╝\n');

let mandatoryFailed = 0;
let totalFailed = 0;

for (const check of checks) {
  const checkStart = Date.now();
  process.stdout.write(`${check.name}... `);
  
  try {
    const output = execSync(check.command, { 
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 120_000,
      env: { ...process.env, CI: 'true' },
    });
    check.passed = true;
    check.output = output.slice(-200);
    check.durationMs = Date.now() - checkStart;
    console.log(`✓ PASS (${check.durationMs}ms)`);
  } catch (err: any) {
    check.passed = false;
    check.error = err.stderr?.toString()?.slice(0, 500) || err.message?.slice(0, 500) || 'Unknown error';
    check.durationMs = Date.now() - checkStart;
    
    if (check.mandatory) {
      mandatoryFailed++;
      console.log(`✗ FAIL (MANDATORY)`);
    } else {
      console.log(`⚠ WARN (non-mandatory)`);
    }
    totalFailed++;
  }
}

const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);

console.log('\n═══════════════════════════════════════════');
console.log(`  Gate Duration: ${totalDuration}s`);
console.log(`  Mandatory Checks: ${checks.filter(c => c.mandatory).length}`);
console.log(`  Optional Checks:  ${checks.filter(c => !c.mandatory).length}`);
console.log(`  Passed: ${checks.filter(c => c.passed).length}`);
console.log(`  Failed: ${totalFailed} (${mandatoryFailed} mandatory)`);
console.log('═══════════════════════════════════════════\n');

// Detailed report for failed checks
if (mandatoryFailed > 0 || totalFailed > 0) {
  console.log('FAILED CHECKS:');
  for (const check of checks) {
    if (!check.passed) {
      console.log(`\n  [${check.mandatory ? 'MANDATORY' : 'WARN'}] ${check.name}`);
      if (check.error) {
        console.log(`  Error: ${check.error}`);
      }
    }
  }
}

if (mandatoryFailed > 0) {
  console.log(`\nRELEASE GATE: FAIL (${mandatoryFailed} mandatory check(s) failed)`);
  process.exit(1);
} else {
  console.log('\nRELEASE GATE: PASS');
  process.exit(0);
}
