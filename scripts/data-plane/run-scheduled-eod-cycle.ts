/**
 * run-scheduled-eod-cycle.ts — CLI entrypoint for scheduled EOD market data refresh.
 *
 * Usage:
 *   npx tsx scripts/data-plane/run-scheduled-eod-cycle.ts \
 *     [--budget 150] [--symbols "RELIANCE,TCS,INFY"] [--dry-run]
 *
 * When --symbols is omitted, the active universe is inferred from the stocks table.
 * When --dry-run is set, no provider calls are made; only cache state is inspected.
 */

import { EodRefreshScheduler, type EodRefreshConfig } from '../../src/services/scheduler/EodRefreshScheduler';
import { JobLock } from '../../src/services/scheduler/JobLock';

function parseArgs(): { budget: number; symbols: string[]; dryRun: boolean } {
  const args = process.argv.slice(2);
  let budget = 150;
  let symbols: string[] = [];
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--budget' && args[i + 1]) {
      budget = parseInt(args[++i], 10);
      if (Number.isNaN(budget) || budget < 1) budget = 150;
    } else if (args[i] === '--symbols' && args[i + 1]) {
      symbols = args[++i].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    }
  }
  return { budget, symbols, dryRun };
}

async function main(): Promise<void> {
  const { budget, symbols, dryRun } = parseArgs();

  if (dryRun) {
    console.log(`[dry-run] Would run EOD refresh cycle: budget=${budget}, symbols=${symbols.length > 0 ? symbols.join(',') : '(universe auto-detect)'}`);
    return;
  }

  const locked = await JobLock.acquire('eod-refresh', 600_000);
  if (!locked) {
    console.log('EOD refresh skipped — another instance is already running');
    return;
  }

  try {
    const config: EodRefreshConfig = {
      budgetPerCycle: budget,
      symbols,
      namespaces: ['quote', 'profile', 'financials'],
      cooldownMs: 86_400_000,
    };
    const result = await EodRefreshScheduler.runCycle(config);
    console.log(`EOD refresh complete: ${JSON.stringify(result)}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`EOD refresh failed: ${msg}`);
    process.exitCode = 1;
  } finally {
    await JobLock.release('eod-refresh');
  }
}

main();
