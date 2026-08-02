#!/usr/bin/env node

/**
 * run-health-report.mjs — CLI health report for the internal data plane.
 *
 * Prints a human-readable summary to stdout.  Designed for ops / cron use.
 *
 * Usage:
 *   node scripts/data-plane/run-health-report.mjs
 *   node scripts/data-plane/run-health-report.mjs --json
 *
 * Flags:
 *   --json     Output raw JSON (for programmatic / webhook consumption)
 *
 * No public provider/API/backend/cache/quota wording is used in output labels.
 * This script is admin-only and must not be exposed on public routes.
 */

const reportJson = process.argv.includes('--json');

async function main() {
  // Dynamic import via tsx — tsx resolves .ts extensions in ESM context
  const { buildDataPlaneHealthReport } = await import(
    '../../src/data-plane/admin/dataPlaneHealthBuilder.ts'
  );

  const health = await buildDataPlaneHealthReport();

  if (reportJson) {
    console.log(JSON.stringify(health, null, 2));
    process.exit(health.overall.ok ? 0 : 1);
  }

  // ── Human-readable output ────────────────────────────────────────────
  const ok = (v) => (v ? 'OK' : 'FAIL');
  const pct = (n) => `${(n * 100).toFixed(1)}%`;

  console.log('=== Data Plane Health Report =======================');
  console.log(`Generated:         ${health.generatedAt}`);
  console.log('');
  console.log('  Overall:');
  console.log(`    Status:          ${health.overall.ok ? 'OK' : 'DEGRADED'}`);
  if (health.overall.degraded) console.log('    (degraded — some checks not passing)');
  console.log('');
  console.log('  EOD Refresh:');
  console.log(`    Last run:        ${health.eodRefreshRun.lastRun ?? 'never'}`);
  console.log(`    Status:          ${ok(health.eodRefreshRun.ok)}`);
  console.log('');
  console.log('  Precompute:');
  console.log(`    Last run:        ${health.precomputeRun.lastRun ?? 'never'}`);
  console.log(`    Status:          ${ok(health.precomputeRun.ok)}`);
  console.log('');
  console.log('  Cache Cleanup:');
  console.log(`    Last run:        ${health.cacheCleanupRun.lastRun ?? 'never'}`);
  console.log(`    Status:          ${ok(health.cacheCleanupRun.ok)}`);
  console.log('');
  console.log('  Cache:');
  console.log(`    Hit rate:        ${pct(health.cache.hitRate)}`);
  console.log(`    Stale entries:   ${health.cache.staleEntries}`);
  console.log(`    Total entries:   ${health.cache.totalEntries}`);
  console.log(`    Status:          ${ok(health.cache.ok)}`);
  console.log('');
  console.log('  Quota:');
  console.log(`    Calls today:     ${health.quota.totalCallsToday}`);
  console.log(`    Calls this hour: ${health.quota.totalCallsThisHour}`);
  console.log(`    Budget exhausted:${health.quota.budgetExhausted}`);
  console.log(`    Status:          ${ok(health.quota.ok)}`);
  console.log('');
  console.log('  Snapshots:');
  console.log(`    Available:       ${health.snapshots.available} / ${health.snapshots.total}`);
  console.log(`    Status:          ${ok(health.snapshots.ok)}`);
  console.log('');
  console.log('  Circuit Breakers:');
  console.log(`    Active:          ${health.circuitBreakers.active.length > 0 ? health.circuitBreakers.active.join(', ') : 'none'}`);
  console.log('==================================================');

  process.exit(health.overall.ok ? 0 : 1);
}

main().catch((err) => {
  console.error('Health report failed:', err);
  process.exitCode = 1;
});
