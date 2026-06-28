#!/usr/bin/env tsx
/**
 * refresh-indian-equity-universe.ts
 *
 * CLI job that builds/refreshes the StockStory Indian equity universe.
 *
 * Usage (add to package.json scripts):
 *   npm run data:refresh-universe -- --dry-run
 *   npm run data:refresh-universe -- --limit 500
 *   npm run data:refresh-universe -- --symbol RELIANCE
 *   npm run data:refresh-universe           # live update
 *
 * Requirements:
 *   --dry-run          Print what would be done, do not write.
 *   --symbol <S>       Process a single symbol.
 *   --limit <N>        Max records to process.
 *   --changed-only     Skip records whose data hasn't changed.
 *   --since <ISO>      Only process records updated after this time.
 */

import { program } from "commander";
import { IndianEquityUniverseBuilder } from "../../src/stockstory/data/universe/IndianEquityUniverseBuilder.ts";
import { mayUseSource } from "../../src/stockstory/data/sources/DataSourcePolicy.ts";

program
  .option("--dry-run", "Print what would be done, do not write")
  .option("--symbol <symbol>", "Process a single symbol")
  .option("--limit <number>", "Max records to process", parseInt)
  .option("--changed-only", "Skip records whose data hasn't changed")
  .option("--since <iso>", "Only process records updated after this time");

program.parse(process.argv);

const options = program.opts() as {
  dryRun?: boolean;
  symbol?: string;
  limit?: number;
  changedOnly?: boolean;
  since?: string;
};

async function main() {
  // 1. Check source policy
  const internalCheck = mayUseSource("internal_universe_db");
  if (!internalCheck.allowed) {
    console.log(`[refresh-universe] SKIP — ${internalCheck.reason}`);
    process.exit(0);
  }

  // 2. Prevent writes in dry-run mode
  if (options.dryRun) {
    console.log("[refresh-universe] --dry-run mode: no writes will be performed");
  }

  const builder = new IndianEquityUniverseBuilder();

  // 3. In a real environment, this would fetch from the DB and providers.
  //    The following is a scaffold that demonstrates the pipeline.
  const sourceRecords: Array<{ symbol: string; companyName?: string; exchange?: string }> = [];

  if (options.symbol) {
    console.log(`[refresh-universe] Single-symbol mode: ${options.symbol}`);
  }

  if (sourceRecords.length === 0) {
    console.log("[refresh-universe] No source records to process.");
    console.log("[refresh-universe] This is expected when no provider is wired yet.");
    console.log("[refresh-universe] Run `npm run universe:sync` first to seed the universe DB.");
    process.exit(0);
  }

  const entries = builder.buildFromRecords(sourceRecords);

  if (options.dryRun) {
    console.log(`[refresh-universe] DRY-RUN: would process ${entries.length} entries`);
    for (const e of entries.slice(0, 5)) {
      console.log(`  ${e.symbol} — ${e.companyName} [${e.exchange}]`);
    }
    if (entries.length > 5) {
      console.log(`  ... and ${entries.length - 5} more`);
    }
    console.log("[refresh-universe] DRY-RUN complete — no writes performed");
    process.exit(0);
  }

  console.log(`[refresh-universe] Processed ${entries.length} entries`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[refresh-universe] Fatal error:", err);
  process.exit(1);
});
