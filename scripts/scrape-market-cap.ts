/**
 * Scrape real market capitalisation for the PSE universe.
 *
 * Why this exists: nothing in the repo carried a real market cap. The bundled
 * data/stock-universe.json had `marketCap: 0` for every entry, PSE Edge's
 * disclosure scrape (data/pse-fundamentals.json) has `sharesOutstanding: null`
 * for 270 of 271 companies, and the configured EODHD / Twelve Data keys are on
 * plans that 403/404 for PSE fundamentals. stockanalysis.com publishes the
 * figure as plain server-rendered HTML (no JS, no key) and its robots.txt
 * permits a generic user-agent on /quote/, so that is the source here.
 *
 * Output units are MILLIONS of PHP, matching inferMcapCategory() in
 * StockUniverseAdapter.ts, whose large/mid/small thresholds (20000/5000/500)
 * are millions — writing raw pesos would classify every company as "large".
 *
 * Politeness follows the PSEEdgeScraper pattern: withRetry() for transient
 * failures, batches of 4 with a 1200ms gap, and per-symbol isolation so one
 * bad symbol never aborts the run.
 *
 *   npx tsx scripts/scrape-market-cap.ts --symbol=BDO --dry-run
 *   npx tsx scripts/scrape-market-cap.ts --limit=10
 *   npx tsx scripts/scrape-market-cap.ts
 *   npx tsx scripts/scrape-market-cap.ts --write-db
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRetry } from "../src/services/scrapers/PSEEdgeScraper";
import { getCanonicalSymbols } from "./lib/canonical-symbols";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUTPUT = path.join(root, "data", "pse-market-cap.json");

const SOURCE = "stockanalysis.com";
const USER_AGENT =
  "StockEXMarketCapBot/1.0 (+https://stockstory-india.com; contact: samvidhmehta276@gmail.com)";
const CONCURRENCY = 4;
const BATCH_DELAY_MS = 1200;

/** Suffix multipliers, expressed in millions (the unit we store). */
const SUFFIX_TO_MILLIONS: Record<string, number> = {
  T: 1_000_000,
  B: 1_000,
  M: 1,
  K: 0.001,
};

export interface MarketCapRecord {
  marketCap: number;
  raw: string;
  scrapedAt: string;
}

/**
 * Parse a stockanalysis.com market-cap string ("651.45B", "1.2T", "840.50M")
 * into millions of PHP. Returns null for anything unrecognised — an unparsed
 * string is a scrape regression, not a zero.
 */
export function parseMarketCap(raw: string): number | null {
  const cleaned = raw.replace(/[,\s]/g, "").trim();
  const match = /^([0-9]*\.?[0-9]+)([TBMK])?$/i.exec(cleaned);
  if (!match) return null;

  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;

  // No suffix means the figure is already in whole pesos.
  const multiplier = match[2] ? SUFFIX_TO_MILLIONS[match[2].toUpperCase()] : 1e-6;
  return Math.round(value * multiplier * 100) / 100;
}

/**
 * Fetch one symbol's market cap. Returns null when the page loads but carries
 * no market cap (delisted, suspended, or not covered) — distinct from a thrown
 * error, which withRetry treats as transient and retries.
 */
export async function fetchMarketCap(symbol: string): Promise<MarketCapRecord | null> {
  const url = `https://${SOURCE}/quote/pse/${encodeURIComponent(symbol.toUpperCase())}/`;
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    // Thrown so withRetry backs off — 429/5xx are transient, not "no data".
    throw new Error(`HTTP ${response.status} for ${symbol}`);
  }

  const html = await response.text();
  // Two markup variants exist for the label cell: linked ("Market Cap</a>…")
  // on most quotes, and unlinked ("Market Cap<!--]--></td>…") on others such
  // as SLF. Anchoring on the *next table cell* after the label handles both;
  // the earlier `Market Cap<\/a>` form silently missed the unlinked variant.
  const match = /Market Cap.*?<td[^>]*>\s*([^<\s][^<]*)/s.exec(html);
  if (!match) return null;

  const raw = match[1].trim();
  const marketCap = parseMarketCap(raw);
  if (marketCap === null) return null;

  return { marketCap, raw, scrapedAt: new Date().toISOString() };
}

/** Scrape every symbol in polite batches, isolating per-symbol failures. */
export async function scrapeAllMarketCaps(
  symbols: string[],
): Promise<Map<string, MarketCapRecord | null>> {
  const results = new Map<string, MarketCapRecord | null>();

  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);

    await Promise.all(
      batch.map(async (symbol) => {
        try {
          results.set(symbol, await withRetry(() => fetchMarketCap(symbol)));
        } catch (err) {
          console.warn(
            `[market-cap] ${symbol} failed: ${err instanceof Error ? err.message : String(err)}`,
          );
          results.set(symbol, null);
        }
      }),
    );

    const done = Math.min(i + CONCURRENCY, symbols.length);
    console.log(`[market-cap] ${done}/${symbols.length} scraped`);
    if (done < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  return results;
}

/**
 * Write market caps into financial_snapshots.
 *
 * Deliberately NOT reusing ingest-fundamentals.ts's upsertFinancialSnapshot():
 * that helper writes every fundamentals column at once, so calling it with a
 * market-cap-only payload would null out real pe_ratio / roe / eps values on
 * any existing row for the same (symbol, period_end). This narrow upsert
 * touches market_cap and nothing else.
 *
 * Opt-in via --write-db: the JSON file is the artefact the universe generator
 * consumes, and this write targets a shared production table.
 */
async function writeToDatabase(records: Map<string, MarketCapRecord | null>): Promise<void> {
  const { dbAdapter } = await import("../src/db/DatabaseAdapter");
  const { tableColumns } = await import("./ingest-fundamentals");

  await dbAdapter.initialize();
  if (dbAdapter.kind === "unavailable") {
    console.warn("[market-cap] database unavailable — skipping DB write");
    return;
  }

  const columns = await tableColumns(dbAdapter, "financial_snapshots");
  if (!columns.has("market_cap")) {
    console.warn("[market-cap] financial_snapshots has no market_cap column — skipping DB write");
    return;
  }

  const periodEnd = new Date().toISOString().slice(0, 10);
  let written = 0;

  for (const [symbol, record] of records) {
    if (!record) continue;
    try {
      if (dbAdapter.kind === "sqlite") {
        await dbAdapter.query(
          `INSERT INTO financial_snapshots (symbol, period_end, market_cap) VALUES ($1, $2, $3)
           ON CONFLICT (symbol, period_end) DO UPDATE SET market_cap = excluded.market_cap`,
          [symbol, periodEnd, record.marketCap],
        );
      } else {
        await dbAdapter.query(
          `INSERT INTO financial_snapshots (symbol, period_end, market_cap) VALUES ($1, $2, $3)
           ON CONFLICT (symbol, period_end) DO UPDATE SET market_cap = EXCLUDED.market_cap`,
          [symbol, periodEnd, record.marketCap],
        );
      }
      written++;
    } catch (err) {
      console.warn(
        `[market-cap] DB write failed for ${symbol}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log(`[market-cap] wrote ${written} rows to financial_snapshots (period_end=${periodEnd})`);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string): string | null => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  const dryRun = args.includes("--dry-run");
  const writeDb = args.includes("--write-db");

  const only = arg("symbol");
  const limit = arg("limit");

  let symbols = only
    ? only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : getCanonicalSymbols();
  if (limit) symbols = symbols.slice(0, Number(limit));

  if (symbols.length === 0) {
    throw new Error("No symbols to scrape — is data/pse-sectors.json present?");
  }

  console.log(`[market-cap] scraping ${symbols.length} symbol(s) from ${SOURCE}`);
  const results = await scrapeAllMarketCaps(symbols);

  const found = [...results.values()].filter(Boolean).length;
  console.log(`[market-cap] ${found}/${symbols.length} resolved`);

  for (const [symbol, record] of results) {
    console.log(`  ${symbol.padEnd(8)} ${record ? `${record.raw.padStart(10)}  → ${record.marketCap}M` : "—"}`);
  }

  if (dryRun) {
    console.log("[market-cap] --dry-run: nothing written");
    return;
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: SOURCE,
    totalSymbols: symbols.length,
    resolved: found,
    units: "millions PHP",
    results: Object.fromEntries(
      [...results].filter(([, record]) => record !== null) as Array<[string, MarketCapRecord]>,
    ),
  };

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`[market-cap] wrote ${found} records to ${OUTPUT}`);

  if (writeDb) await writeToDatabase(results);
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
