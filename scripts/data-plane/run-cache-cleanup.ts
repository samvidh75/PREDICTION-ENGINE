/**
 * run-cache-cleanup.ts — CLI entrypoint for purging expired cache entries.
 *
 * Usage:
 *   npx tsx scripts/data-plane/run-cache-cleanup.ts [--batch 1000] [--dry-run]
 *
 * Safe to run repeatedly — uses a job lock and processes expired entries only.
 */

import { EodDataCacheService } from '../../src/services/marketData/EodDataCacheService';
import { JobLock } from '../../src/services/scheduler/JobLock';

function parseArgs(): { batch: number; dryRun: boolean } {
  const args = process.argv.slice(2);
  let batch = 1000;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--batch' && args[i + 1]) {
      batch = parseInt(args[++i], 10);
      if (Number.isNaN(batch) || batch < 1) batch = 1000;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { batch, dryRun };
}

async function main(): Promise<void> {
  const { batch, dryRun } = parseArgs();

  if (dryRun) {
    console.log(`[dry-run] Would delete up to ${batch} expired cache entries`);
    return;
  }

  const locked = await JobLock.acquire('cache-cleanup', 120_000);
  if (!locked) {
    console.log('Cache cleanup skipped — another instance is already running');
    return;
  }

  try {
    const deleted = await EodDataCacheService.cleanupExpired();
    console.log(`Cache cleanup complete: ${deleted} expired entries removed`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Cache cleanup failed: ${msg}`);
    process.exitCode = 1;
  } finally {
    await JobLock.release('cache-cleanup');
  }
}

main();
