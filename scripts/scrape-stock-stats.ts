/**
 * Scrape real trailing-twelve-month statistics for the PSE universe.
 *
 * Why this exists: the PSE EDGE filings in data/pse-fundamentals.json are
 * interim — 210 of 268 cover only the six months to 30 June — so every ratio
 * derived from them is for part of a year. Extrapolating to a run rate was an
 * approximation, and a poor one: it put BDO's P/E at 15.89 when the real
 * trailing multiple is 7.56, because the filings' `eps` is not the half-year
 * figure it was assumed to be. These pages publish genuine TTM values instead,
 * so nothing has to be extrapolated.
 *
 * It also supplies three inputs nothing else in the repo had:
 *   - dividend yield -> gives valuationFeatures its second sub-score
 *   - beta           -> gives riskFeatures its volatility sub-score
 *   - shares outstanding -> makes a real P/B computable
 * Together those lift the available factor weight past researchEngine's 0.50
 * minimum, which is what currently blocks every composite score.
 *
 * Same source and politeness as scrape-market-cap.ts: robots.txt permits
 * /quote/ for a generic user-agent, no key and no daily quota.
 *
 *   npx tsx scripts/scrape-stock-stats.ts --symbol=BDO --dry-run
 *   npx tsx scripts/scrape-stock-stats.ts --limit=10
 *   npx tsx scripts/scrape-stock-stats.ts
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withRetry } from "../src/services/scrapers/PSEEdgeScraper";
import { getCanonicalSymbols } from "./lib/canonical-symbols";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const OUTPUT = path.join(root, "data", "pse-stock-stats.json");

const SOURCE = "stockanalysis.com";
const USER_AGENT =
  "StockEXStatsBot/1.0 (+https://stockstory-india.com; contact: samvidhmehta276@gmail.com)";
const CONCURRENCY = 4;
const BATCH_DELAY_MS = 1200;

export interface StockStats {
  symbol: string;
  /** Trailing-twelve-month EPS, as published. */
  eps: number | null;
  peRatio: number | null;
  forwardPe: number | null;
  dividendPerShare: number | null;
  /** Percent, e.g. 3.59 for 3.59%. */
  dividendYield: number | null;
  beta: number | null;
  sharesOutstanding: number | null;
  marketCap: number | null;
  revenueTtm: number | null;
  netIncomeTtm: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  scrapedAt: string;
}

/** "654.65B" / "1.2T" / "5.34M" -> absolute number. */
export function parseMagnitude(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = /^([0-9]*\.?[0-9]+)\s*([TBMK])?$/i.exec(raw.replace(/[, ]/g, "").trim());
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  const mult: Record<string, number> = { T: 1e12, B: 1e9, M: 1e6, K: 1e3 };
  // Rounded: 4.1 * 1e9 lands on 4099999999.9999995 in binary floating point.
  return Math.round(value * (m[2] ? mult[m[2].toUpperCase()] : 1));
}

/** Plain number, tolerating "n/a" and thousands separators. */
export function parseNumber(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[, ]/g, "").trim();
  if (!/^-?[0-9]*\.?[0-9]+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** "4.40 (3.59%)" -> { perShare: 4.40, yield: 3.59 }. */
export function parseDividend(raw: string | undefined): { perShare: number | null; yield: number | null } {
  if (!raw) return { perShare: null, yield: null };
  const m = /^([0-9]*\.?[0-9]+)\s*\(([0-9]*\.?[0-9]+)%\)/.exec(raw.trim());
  if (!m) return { perShare: null, yield: null };
  return { perShare: Number(m[1]), yield: Number(m[2]) };
}

/** "122.30 - 123.90" -> [122.30, 123.90]. */
export function parseRange(raw: string | undefined): [number | null, number | null] {
  if (!raw) return [null, null];
  const m = /^([0-9]*\.?[0-9]+)\s*-\s*([0-9]*\.?[0-9]+)/.exec(raw.trim());
  return m ? [Number(m[1]), Number(m[2])] : [null, null];
}

/**
 * Pull the quote page's statistics table into a label -> value map. The table
 * renders as adjacent <td> pairs; the first occurrence of each label wins,
 * since some labels repeat further down the page.
 */
export function parseStatsTable(html: string): Record<string, string> {
  // Labels of interest. Matching an explicit list rather than every <td> pair
  // keeps unrelated tables on the page (peers, news) out of the result.
  const LABELS = [
    "Market Cap", "Revenue (ttm)", "Net Income", "EPS", "PE Ratio", "Forward PE",
    "Dividend", "Shares Out", "Beta", "Volume", "Open", "Previous Close", "Day's Range",
  ];

  const out: Record<string, string> = {};
  for (const label of LABELS) {
    // Several labels carry a trailing info-icon (a nested <span> containing an
    // <svg>), so the value cell cannot be reached by skipping tags alone —
    // scan forward from the label to the next cell and take its first text.
    const at = html.indexOf(`>${label}<`);
    if (at === -1) continue;

    const after = html.slice(at + label.length, at + label.length + 1200);
    // Only the cell's leading text node. Several cells append a change badge
    // (EPS renders as `16.23 <span>+4.7%</span>`), and flattening the whole
    // cell would yield "16.23 +4.7%", which no numeric parse accepts.
    const cell = /<td[^>]*>\s*([^<]{1,40})/.exec(after);
    if (!cell) continue;

    const text = cell[1].replace(/&nbsp;/g, " ").trim();
    if (text) out[label] = text;
  }
  return out;
}

export async function fetchStats(symbol: string): Promise<StockStats | null> {
  const url = `https://${SOURCE}/quote/pse/${encodeURIComponent(symbol.toUpperCase())}/`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${symbol}`);

  const t = parseStatsTable(await res.text());
  if (Object.keys(t).length === 0) return null;

  const dividend = parseDividend(t["Dividend"]);
  const [dayLow, dayHigh] = parseRange(t["Day's Range"]);

  return {
    symbol: symbol.toUpperCase(),
    eps: parseNumber(t["EPS"]),
    peRatio: parseNumber(t["PE Ratio"]),
    forwardPe: parseNumber(t["Forward PE"]),
    dividendPerShare: dividend.perShare,
    dividendYield: dividend.yield,
    beta: parseNumber(t["Beta"]),
    sharesOutstanding: parseMagnitude(t["Shares Out"]),
    marketCap: parseMagnitude(t["Market Cap"]),
    revenueTtm: parseMagnitude(t["Revenue (ttm)"]),
    netIncomeTtm: parseMagnitude(t["Net Income"]),
    dayLow,
    dayHigh,
    scrapedAt: new Date().toISOString(),
  };
}

async function scrapeAll(symbols: string[]): Promise<Map<string, StockStats | null>> {
  const results = new Map<string, StockStats | null>();
  for (let i = 0; i < symbols.length; i += CONCURRENCY) {
    const batch = symbols.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (s) => {
        try {
          results.set(s, await withRetry(() => fetchStats(s)));
        } catch (err) {
          console.warn(`[stats] ${s} failed: ${err instanceof Error ? err.message : String(err)}`);
          results.set(s, null);
        }
      }),
    );
    const done = Math.min(i + CONCURRENCY, symbols.length);
    if (done % 40 === 0 || done === symbols.length) {
      console.log(`[stats] ${done}/${symbols.length} scraped`);
    }
    if (done < symbols.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }
  return results;
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (n: string) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3) ?? null;
  const dryRun = args.includes("--dry-run");

  const only = arg("symbol");
  const limit = arg("limit");
  let symbols = only
    ? only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : getCanonicalSymbols();
  if (limit) symbols = symbols.slice(0, Number(limit));

  console.log(`[stats] scraping ${symbols.length} symbol(s) from ${SOURCE}`);
  const results = await scrapeAll(symbols);

  const resolved = [...results.values()].filter((v): v is StockStats => v !== null);
  const withPe = resolved.filter((r) => r.peRatio !== null).length;
  const withYield = resolved.filter((r) => r.dividendYield !== null).length;
  const withBeta = resolved.filter((r) => r.beta !== null).length;

  console.log(`\n  resolved        ${resolved.length}/${symbols.length}`);
  console.log(`  with P/E        ${withPe}`);
  console.log(`  with div yield  ${withYield}   <- unlocks the valuation factor`);
  console.log(`  with beta       ${withBeta}   <- unlocks the risk volatility sub-score`);

  if (dryRun) {
    for (const r of resolved.slice(0, 10)) {
      console.log(`  ${r.symbol.padEnd(7)} pe=${r.peRatio} eps=${r.eps} yield=${r.dividendYield} beta=${r.beta} shares=${r.sharesOutstanding}`);
    }
    console.log("[stats] --dry-run: nothing written");
    return;
  }

  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(
    OUTPUT,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        source: SOURCE,
        basis: "trailing twelve months, as published",
        totalSymbols: symbols.length,
        resolved: resolved.length,
        results: Object.fromEntries(resolved.map((r) => [r.symbol, r])),
      },
      null,
      2,
    )}\n`,
  );
  console.log(`\n[stats] wrote ${resolved.length} records to ${OUTPUT}`);
}

const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
