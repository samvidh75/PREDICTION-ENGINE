export {};
/**
 * backfill-public-market-history.ts — Backfill historical OHLCV from public providers.
 *
 * Uses ProviderBroker to try providers in precedence order.
 * Idempotent upsert into daily_prices table. Rate-limited with configurable delay.
 * Dry-run by default, --apply required to write.
 *
 * Usage:
 *   npx tsx scripts/backfill-public-market-history.ts --symbols=HBL,ENGRO --from=2024-01-01 --to=2024-12-31
 *   npx tsx scripts/backfill-public-market-history.ts --symbols=HBL --from=2023-01-01 --to=2024-12-31 --provider=yahoo
 *   npx tsx scripts/backfill-public-market-history.ts --symbols=HBL,ENGRO --from=2024-01-01 --to=2024-12-31 --apply --batch-size=3 --delay-ms=500
 *   npx tsx scripts/backfill-public-market-history.ts --universe=kse100 --from=2024-06-01 --to=2024-12-31 --dry-run
 */

import { dbAdapter } from "../src/db/DatabaseAdapter";
import { KSE100_SYMBOLS } from "../src/backtest/BenchmarkEngine";
import { ProviderBroker } from "../src/providers/marketData/providerBroker";
import type { ProviderId } from "../src/providers/marketData/types";

const VALID_PROVIDERS = new Set(["auto", "psx", "yahoo"]);

interface CliOptions {
  symbols: string[];
  from: string;
  to: string;
  provider: string;
  batchSize: number;
  delayMs: number;
  maxRowsPerSymbol: number;
  skipExisting: boolean;
  refreshStale: boolean;
  apply: boolean;
}

function argValue(args: string[], name: string): string | undefined {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const symbolArg = argValue(args, "--symbols");
  const universe = argValue(args, "--universe");
  const fromRaw = argValue(args, "--from");
  const toRaw = argValue(args, "--to");
  const providerRaw = argValue(args, "--provider");
  const batchSizeRaw = argValue(args, "--batch-size");
  const delayMsRaw = argValue(args, "--delay-ms");
  const maxRowsRaw = argValue(args, "--max-rows-per-symbol");
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");
  const skipExisting = args.includes("--skip-existing");
  const refreshStale = args.includes("--refresh-stale");

  let symbols: string[];
  if (symbolArg) {
    symbols = [...new Set(symbolArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  } else if (universe === "kse100") {
    symbols = [...KSE100_SYMBOLS];
  } else {
    console.error("ERROR: Use --symbols=HBL,ENGRO, --universe=kse100, or --symbols=<csv>");
    process.exit(1);
  }

  const provider = providerRaw || "auto";
  if (!VALID_PROVIDERS.has(provider)) {
    console.error(`ERROR: invalid provider "${provider}". Valid: ${[...VALID_PROVIDERS].join(", ")}`);
    process.exit(1);
  }

  const from = fromRaw || "2020-01-01";
  const to = toRaw || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    console.error("ERROR: --from and --to must be YYYY-MM-DD format");
    process.exit(1);
  }

  return {
    symbols,
    from,
    to,
    provider,
    batchSize: batchSizeRaw ? Math.max(1, Number(batchSizeRaw)) : 3,
    delayMs: delayMsRaw ? Math.max(0, Number(delayMsRaw)) : 300,
    maxRowsPerSymbol: maxRowsRaw ? Math.max(1, Number(maxRowsRaw)) : 5000,
    skipExisting,
    refreshStale,
    apply: apply && !dryRun,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function existingDatesForSymbol(symbol: string): Promise<Set<string>> {
  try {
    const result = await dbAdapter.query(
      `SELECT trade_date FROM daily_prices WHERE symbol = $1`,
      [symbol],
    );
    return new Set(result.rows.map((r) => String(r.trade_date)));
  } catch {
    return new Set();
  }
}

function isStaleDate(date: string, thresholdDays = 7): boolean {
  const d = new Date(date + "T00:00:00.000Z");
  const now = new Date();
  return (now.getTime() - d.getTime()) > thresholdDays * 86_400_000;
}

interface SymbolReport {
  symbol: string;
  provider: ProviderId;
  count: number;
  inserted: number;
  updated: number;
  skipped: number;
  error: string | null;
}

async function main(): Promise<void> {
  const options = parseArgs();
  const broker = new ProviderBroker();

  if (options.apply) {
    await dbAdapter.initialize();
  }

  console.log(JSON.stringify({
    script: "backfill-public-market-history",
    mode: options.apply ? "apply" : "dry-run",
    symbolsRequested: options.symbols.length,
    from: options.from,
    to: options.to,
    provider: options.provider,
    batchSize: options.batchSize,
    delayMs: options.delayMs,
    maxRowsPerSymbol: options.maxRowsPerSymbol,
    skipExisting: options.skipExisting,
    refreshStale: options.refreshStale,
  }, null, 2));

  const reports: SymbolReport[] = [];
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  for (let i = 0; i < options.symbols.length; i += options.batchSize) {
    const batch = options.symbols.slice(i, i + options.batchSize);
    const batchReports = await Promise.all(batch.map(async (symbol): Promise<SymbolReport> => {
      try {
        const existingDates = options.skipExisting || options.refreshStale
          ? await existingDatesForSymbol(symbol)
          : new Set<string>();

        const result = await broker.getHistoricalDaily(symbol, options.from, options.to);
        if (!result.data || result.data.length === 0) {
          return { symbol, provider: result.provider, count: 0, inserted: 0, updated: 0, skipped: 0, error: "no data returned" };
        }

        const candles = result.data.slice(0, options.maxRowsPerSymbol);
        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        for (const candle of candles) {
          const dateStr = candle.date.slice(0, 10);
          if (options.skipExisting && existingDates.has(dateStr)) {
            skipped++;
            continue;
          }
          if (options.refreshStale && existingDates.has(dateStr) && !isStaleDate(dateStr)) {
            skipped++;
            continue;
          }

          if (options.apply) {
            try {
              await dbAdapter.query(
                `INSERT OR REPLACE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [symbol, dateStr, candle.open, candle.high, candle.low, candle.close, candle.close, candle.volume],
              );
            } catch {
              // Fallback to INSERT ... ON CONFLICT for Postgres
              await dbAdapter.query(
                `INSERT INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (symbol, trade_date) DO UPDATE SET
                   open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low,
                   close = EXCLUDED.close, adjusted_close = EXCLUDED.adjusted_close, volume = EXCLUDED.volume`,
                [symbol, dateStr, candle.open, candle.high, candle.low, candle.close, candle.close, candle.volume],
              );
            }
            if (existingDates.has(dateStr)) updated++;
            else inserted++;
          } else {
            if (existingDates.has(dateStr)) updated++;
            else inserted++;
          }
        }

        return { symbol, provider: result.provider, count: candles.length, inserted, updated, skipped, error: null };
      } catch (err) {
        return {
          symbol,
          provider: "unavailable" as ProviderId,
          count: 0,
          inserted: 0,
          updated: 0,
          skipped: 0,
          error: err instanceof Error ? err.message.slice(0, 200) : String(err),
        };
      }
    }));

    for (const r of batchReports) {
      reports.push(r);
      totalInserted += r.inserted;
      totalUpdated += r.updated;
      totalSkipped += r.skipped;
    }

    if (i + options.batchSize < options.symbols.length && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  console.log(JSON.stringify({
    summary: {
      mode: options.apply ? "apply" : "dry-run",
      total: options.symbols.length,
      totalCandles: reports.reduce((s, r) => s + r.count, 0),
      totalInserted,
      totalUpdated,
      totalSkipped,
      failed: reports.filter((r) => r.error).length,
      providersUsed: [...new Set(reports.map((r) => r.provider).filter(Boolean))],
    },
    reports,
  }, null, 2));

  if (options.apply) {
    await dbAdapter.shutdown();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
