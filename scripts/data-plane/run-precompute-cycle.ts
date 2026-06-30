/**
 * run-precompute-cycle.ts — CLI entrypoint for running all precomputed analytical snapshots.
 *
 * Usage:
 *   npx tsx scripts/data-plane/run-precompute-cycle.ts [--dry-run]
 *
 * When --dry-run is set, logs the engines that would run without executing them.
 */

import { PrecomputeScheduler } from '../../src/services/scheduler/PrecomputeScheduler';
import { JobLock } from '../../src/services/scheduler/JobLock';

function parseArgs(): { dryRun: boolean } {
  return { dryRun: process.argv.includes('--dry-run') };
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs();

  if (dryRun) {
    console.log('[dry-run] Would run all precompute engines: healthometer, scanner, rankings, event evidence, watchlist theses');
    return;
  }

  const locked = await JobLock.acquire('precompute-snapshots', 600_000);
  if (!locked) {
    console.log('Precompute cycle skipped — another instance is already running');
    return;
  }

  try {
    const result = await PrecomputeScheduler.runAll();
    console.log(`Precompute cycle complete: ${JSON.stringify(result)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Precompute cycle failed: ${msg}`);
    process.exitCode = 1;
  } finally {
    await JobLock.release('precompute-snapshots');
  }
}

main();
