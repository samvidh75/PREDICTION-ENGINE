export {};
/**
 * import-public-fundamentals.ts — Imports financial data from public NSE sources.
 *
 * Sources: nsepython (nse_results, nse_past_results).
 * Normalizes into financial_snapshots table format. Idempotent upsert.
 * Dry-run by default, --apply required to write.
 *
 * Usage:
 *   npx tsx scripts/import-public-fundamentals.ts --symbols=RELIANCE,TCS
 *   npx tsx scripts/import-public-fundamentals.ts --symbols=RELIANCE,TCS --apply
 *   npx tsx scripts/import-public-fundamentals.ts --universe=nifty50 --batch-size=10 --delay-ms=500
 */

import { dbAdapter } from "../src/db/DatabaseAdapter";
import { NIFTY50_SYMBOLS } from "../src/backtest/BenchmarkEngine";
import { execSync } from "node:child_process";

const TRACKED_FIELDS = [
  "marketCap", "peRatio", "pbRatio", "eps", "roe",
  "debtToEquity", "revenueGrowth", "earningsGrowth",
  "operatingMargin", "netMargin",
] as const;

interface NormalizedRow {
  symbol: string;
  periodEndDate: string;
  sourceLabel: string;
  sourceUrl: string | null;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  roe: number | null;
  debtToEquity: number | null;
  revenueGrowth: number | null;
  earningsGrowth: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
}

interface CliOptions {
  symbols: string[];
  batchSize: number;
  delayMs: number;
  apply: boolean;
}

function argValue(args: string[], name: string): string | undefined {
  return args.find((arg) => arg.startsWith(`${name}=`))?.split("=").slice(1).join("=");
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const symbolArg = argValue(args, "--symbols");
  const universe = argValue(args, "--universe");
  const batchSizeRaw = argValue(args, "--batch-size");
  const delayMsRaw = argValue(args, "--delay-ms");
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run");

  let symbols: string[];
  if (symbolArg) {
    symbols = [...new Set(symbolArg.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))];
  } else if (universe === "nifty50") {
    symbols = [...NIFTY50_SYMBOLS];
  } else {
    console.error("ERROR: Use --symbols=RELIANCE,TCS or --universe=nifty50");
    process.exit(1);
  }

  return {
    symbols,
    batchSize: batchSizeRaw ? Math.max(1, Number(batchSizeRaw)) : 5,
    delayMs: delayMsRaw ? Math.max(0, Number(delayMsRaw)) : 200,
    apply: apply && !dryRun,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function finiteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fetchFromNsepython(symbol: string): NormalizedRow | null {
  try {
    const output = execSync(`python3 -c "
import json, sys
try:
    import nsepython
    r = nsepython.nse_results('${symbol}')
    if isinstance(r, dict) and len(r) > 0:
        print(json.dumps(r, default=str)[:5000])
    else:
        print('{}')
except Exception:
    print('{}')
"`, { encoding: "utf-8", timeout: 30_000, maxBuffer: 1024 * 1024 });
    const raw = JSON.parse(output.trim());
    if (!raw || Object.keys(raw).length === 0) return null;
    const keys = Object.keys(raw);
    const revenueGrowth = keys.some((k) => /revenue.*growth|sales.*growth/i.test(k))
      ? finiteOrNull(raw[keys.find((k) => /revenue.*growth|sales.*growth/i.test(k))!])
      : null;
    const profitGrowth = keys.some((k) => /profit.*growth|earnings.*growth|pat.*growth/i.test(k))
      ? finiteOrNull(raw[keys.find((k) => /profit.*growth|earnings.*growth|pat.*growth/i.test(k))!])
      : null;
    return {
      symbol,
      periodEndDate: raw.year_end || raw.period_end || raw.year || new Date().toISOString().slice(0, 10),
      sourceLabel: "nsepython.nse_results",
      sourceUrl: `https://www.nseindia.com/api/result?symbol=${encodeURIComponent(symbol)}`,
      marketCap: null,
      peRatio: finiteOrNull(raw.pe || raw.pe_ratio),
      pbRatio: finiteOrNull(raw.pb || raw.pb_ratio || raw.book_value),
      eps: finiteOrNull(raw.eps),
      roe: finiteOrNull(raw.roe),
      debtToEquity: finiteOrNull(raw.debt_to_equity || raw.de || raw.debt_equity),
      revenueGrowth,
      earningsGrowth: profitGrowth,
      operatingMargin: finiteOrNull(raw.operating_margin || raw.op_margin),
      netMargin: finiteOrNull(raw.net_margin || raw.profit_margin),
    };
  } catch {
    return null;
  }
}

function hasUsefulMetrics(row: NormalizedRow): boolean {
  const metrics = [row.marketCap, row.peRatio, row.pbRatio, row.eps, row.roe, row.debtToEquity, row.revenueGrowth, row.earningsGrowth, row.operatingMargin, row.netMargin];
  return metrics.some((m) => m !== null);
}

async function main(): Promise<void> {
  const options = parseArgs();
  console.log(JSON.stringify({
    script: "import-public-fundamentals",
    mode: options.apply ? "apply" : "dry-run",
    symbolsRequested: options.symbols.length,
    batchSize: options.batchSize,
    delayMs: options.delayMs,
  }));

  if (options.apply) {
    await dbAdapter.initialize();
  }

  const results: Array<{ symbol: string; status: string; fields: number; source: string | null; error: string | null }> = [];
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < options.symbols.length; i += options.batchSize) {
    const batch = options.symbols.slice(i, i + options.batchSize);
    const batchResults = await Promise.all(batch.map(async (symbol) => {
      const row = fetchFromNsepython(symbol);
      const source = row ? "nsepython" : null;
      if (!row) {
        return { symbol, status: "skipped", fields: 0, source: null, error: "no data from any source" };
      }
      if (!hasUsefulMetrics(row)) {
        return { symbol, status: "rejected", fields: 0, source, error: "no useful financial metrics" };
      }
      const fieldCount = TRACKED_FIELDS.filter((f) => row[f as keyof typeof row] !== null).length;
      if (options.apply) {
        try {
          const columns = ["symbol", "period_end", "source_label", "source_url", "market_cap", "pe_ratio", "pb_ratio", "eps", "roe", "debt_to_equity", "revenue_growth", "earnings_growth", "operating_margin", "net_margin"];
          const placeholders = columns.map((_, j) => `$${j + 1}`);
          const updates = columns.filter((c) => c !== "symbol" && c !== "period_end" && c !== "source_label" && c !== "source_url").map((c) => `${c} = EXCLUDED.${c}`).join(", ");
          await dbAdapter.query(
            `INSERT INTO financial_snapshots (${columns.join(", ")}) VALUES (${placeholders.join(", ")})
             ON CONFLICT (symbol, period_end) DO UPDATE SET ${updates}`,
            [row.symbol, row.periodEndDate, row.sourceLabel, row.sourceUrl, row.marketCap, row.peRatio, row.pbRatio, row.eps, row.roe, row.debtToEquity, row.revenueGrowth, row.earningsGrowth, row.operatingMargin, row.netMargin],
          );
          return { symbol, status: "inserted", fields: fieldCount, source, error: null };
        } catch (err) {
          return { symbol, status: "error", fields: fieldCount, source, error: err instanceof Error ? err.message.slice(0, 200) : String(err) };
        }
      }
      return { symbol, status: "ready", fields: fieldCount, source, error: null };
    }));
    for (const r of batchResults) {
      results.push(r);
      if (r.status === "inserted") inserted++;
      else if (r.status === "skipped" || r.status === "rejected") skipped++;
      else if (r.status === "error") failed++;
    }
    if (i + options.batchSize < options.symbols.length && options.delayMs > 0) {
      await sleep(options.delayMs);
    }
  }

  console.log(JSON.stringify({
    summary: {
      mode: options.apply ? "apply" : "dry-run",
      total: options.symbols.length,
      inserted,
      ready: results.filter((r) => r.status === "ready").length,
      skipped,
      failed,
    },
    results,
  }, null, 2));

  if (options.apply) {
    await dbAdapter.shutdown();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
