/**
 * Build daily price history for the PSE universe — free, no key, no quota.
 *
 * The gap this closes: momentum was the one factor that could never be scored.
 * EODHD serves real history but its free tier allows 20 requests a day against
 * 282 symbols needed; Twelve Data has no PSE coverage; Yahoo's .PS suffix
 * resolves to unrelated instruments; Stooq now sits behind a proof-of-work bot
 * challenge. What does work is PHISIX's dated endpoint —
 * /stocks/{SYMBOL}.{YYYY-MM-DD}.json — which returns that day's real close and
 * volume, is unmetered, and needs no credentials.
 *
 * Sizing: momentumFeatures needs 5 candles for its short-term score, 20 for the
 * price trend and 60 for the medium term, so ~65 trading days is enough for the
 * factor to resolve fully. A year of data is not required and is not fetched.
 *
 * Two modes:
 *   backfill    per-symbol, per-date. Resumable — an interrupted run picks up
 *               exactly where it stopped, because every symbol/date already on
 *               disk is skipped.
 *   --daily     one request to /stocks.json returns the whole board, appending
 *               today's bar for every symbol at a cost of a single call. This
 *               is the steady-state mode once a backfill exists.
 *
 *   npx tsx scripts/backfill-price-history.ts --days=65 --limit=5
 *   npx tsx scripts/backfill-price-history.ts --days=65
 *   npx tsx scripts/backfill-price-history.ts --daily
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCanonicalSymbols } from "./lib/canonical-symbols";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUTPUT = path.join(root, "data", "pse-price-history.json");

const BASE = "https://phisix-api3.appspot.com";
const USER_AGENT =
  "StockEXHistoryBot/1.0 (+https://stockstory-india.com; contact: samvidhmehta276@gmail.com)";
const CONCURRENCY = 6;
const BATCH_DELAY_MS = 400;

export interface Candle {
  date: string;
  close: number;
  volume: number;
}

type HistoryMap = Record<string, Candle[]>;

/** Weekdays only — the PSE does not trade weekends, so those never resolve. */
export function tradingDays(count: number, from = new Date()): string[] {
  const out: string[] = [];
  const cursor = new Date(from);
  while (out.length < count) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) out.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() - 1);
  }
  return out;
}

async function loadExisting(): Promise<HistoryMap> {
  try {
    const raw = await readFile(OUTPUT, "utf-8");
    return JSON.parse(raw).results ?? {};
  } catch {
    return {};
  }
}

async function save(results: HistoryMap): Promise<void> {
  const symbols = Object.keys(results);
  const candles = symbols.reduce((n, s) => n + results[s].length, 0);
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(
    OUTPUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: "phisix-api3.appspot.com",
        note: "Daily closes and volume from PHISIX's dated endpoint. Free, unmetered, no key.",
        symbols: symbols.length,
        candles,
        results,
      },
      null,
      2,
    )}\n`,
  );
}

/** One symbol on one date. null when the market was shut or the symbol had no trade. */
async function fetchCandle(symbol: string, date: string): Promise<Candle | null> {
  try {
    const res = await fetch(`${BASE}/stocks/${encodeURIComponent(symbol)}.${date}.json`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      stocks?: Array<{ price?: { amount?: number }; volume?: number }>;
    };
    const stock = data.stocks?.[0];
    const close = stock?.price?.amount;
    if (typeof close !== "number" || !Number.isFinite(close)) return null;
    // Historical responses omit percentChange — only close and volume are
    // published, which is all the momentum engine reads.
    return { date, close, volume: Number(stock?.volume ?? 0) };
  } catch {
    return null;
  }
}

/** Append today's board for every symbol in a single request. */
async function runDaily(results: HistoryMap): Promise<void> {
  const res = await fetch(`${BASE}/stocks.json`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`daily snapshot HTTP ${res.status}`);

  const data = (await res.json()) as {
    stocks?: Array<{ symbol: string; price?: { amount?: number }; volume?: number }>;
    as_of?: string;
  };
  const date = (data.as_of ?? new Date().toISOString()).slice(0, 10);

  let added = 0;
  for (const s of data.stocks ?? []) {
    const close = s.price?.amount;
    if (typeof close !== "number" || !Number.isFinite(close)) continue;
    const symbol = s.symbol.toUpperCase();
    const series = (results[symbol] ??= []);
    if (series.some((c) => c.date === date)) continue;
    series.push({ date, close, volume: Number(s.volume ?? 0) });
    series.sort((a, b) => a.date.localeCompare(b.date));
    added++;
  }
  console.log(`[history] daily snapshot ${date}: appended ${added} bars in 1 request`);
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;

  const results = await loadExisting();

  if (args.includes("--daily")) {
    await runDaily(results);
    await save(results);
    return;
  }

  const days = Number(arg("days") ?? 65);
  const limit = arg("limit");
  const only = arg("symbols");

  let symbols = only
    ? only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : getCanonicalSymbols();
  if (limit) symbols = symbols.slice(0, Number(limit));

  const dates = tradingDays(days);

  // Only what is genuinely absent, so a re-run costs nothing for work already done.
  const jobs: Array<{ symbol: string; date: string }> = [];
  for (const symbol of symbols) {
    const have = new Set((results[symbol] ?? []).map((c) => c.date));
    for (const date of dates) if (!have.has(date)) jobs.push({ symbol, date });
  }

  console.log(`[history] ${symbols.length} symbols x ${days} trading days`);
  console.log(`[history] ${jobs.length} candle(s) to fetch (already on disk: ${symbols.length * days - jobs.length})`);
  if (jobs.length === 0) return;

  let done = 0;
  let hit = 0;
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const candles = await Promise.all(batch.map((j) => fetchCandle(j.symbol, j.date)));

    batch.forEach((job, idx) => {
      const candle = candles[idx];
      if (!candle) return;
      const series = (results[job.symbol] ??= []);
      if (!series.some((c) => c.date === candle.date)) {
        series.push(candle);
        hit++;
      }
    });

    done += batch.length;
    // Checkpoint regularly: a long run must survive interruption without
    // losing everything fetched so far.
    if (done % 600 === 0) {
      for (const s of Object.keys(results)) results[s].sort((a, b) => a.date.localeCompare(b.date));
      await save(results);
      console.log(`[history] ${done}/${jobs.length} requested, ${hit} candles stored (checkpointed)`);
    }
    if (i + CONCURRENCY < jobs.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  for (const s of Object.keys(results)) results[s].sort((a, b) => a.date.localeCompare(b.date));
  await save(results);

  const withEnough = Object.values(results).filter((c) => c.length >= 20).length;
  console.log(`\n  requested        ${jobs.length}`);
  console.log(`  candles stored   ${hit}`);
  console.log(`  symbols >=20 bars ${withEnough}   <- enough for the price-trend score`);
  console.log(`\n[history] wrote ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
