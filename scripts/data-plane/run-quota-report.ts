/**
 * run-quota-report.ts — CLI entrypoint for generating a provider quota usage report.
 *
 * Usage:
 *   npx tsx scripts/data-plane/run-quota-report.ts [--json] [--dry-run]
 *
 * With --json, outputs the report as JSON for programmatic consumption.
 * Without --json, outputs a human-readable summary.
 */

import { ProviderQuotaMonitor } from '../../src/services/scheduler/ProviderQuotaMonitor';

function parseArgs(): { json: boolean; dryRun: boolean } {
  return {
    json: process.argv.includes('--json'),
    dryRun: process.argv.includes('--dry-run'),
  };
}

async function main(): Promise<void> {
  const { json, dryRun } = parseArgs();

  if (dryRun) {
    console.log('[dry-run] Would fetch quota report from ProviderQuotaMonitor');
    return;
  }

  try {
    const report = await ProviderQuotaMonitor.getReport();

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log('=== Provider Quota Report ===');
      console.log(`Total calls today:       ${report.summary.totalCallsToday}`);
      console.log(`Total calls this hour:   ${report.summary.totalCallsThisHour}`);
      console.log(`Cache hit rate:          ${(report.summary.cacheHitRate * 100).toFixed(1)}%`);
      console.log(`Budget exhausted:        ${report.summary.budgetExhausted}`);
      console.log(`Per provider:            ${JSON.stringify(report.perProvider)}`);
      console.log(`Per namespace:           ${JSON.stringify(report.perNamespace)}`);
      console.log(`Provider errors:         ${JSON.stringify(report.providerErrors)}`);
      console.log('============================');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Quota report failed: ${msg}`);
    process.exitCode = 1;
  }
}

main();
