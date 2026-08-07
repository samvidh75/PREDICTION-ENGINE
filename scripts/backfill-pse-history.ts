/**
 * backfill-pse-history.ts
 *
 * Real multi-year PSE price history backfill, sourced directly from PSE EDGE's
 * (edge.pse.com.ph) own historical chart endpoint — the true primary source for
 * PSE OHLCV. This is the only path to a *working* walk-forward backtest, because
 * EODHD caps PSE history at ~245 trading bars (ETL-proven this session) and the
 * old Yahoo `.PS` source is a frozen-2019 stub.
 *
 * Endpoint (reverse-engineered from the live stockData page 2026-08-07):
 *   POST https://edge.pse.com.ph/common/DisclosureCht.ax
 *   Content-Type: application/json
 *   body: { "cmpy_id": "<int>", "security_id": "<int>",
 *           "startDate": "MM-DD-YYYY", "endDate": "MM-DD-YYYY" }
 *   -> { chartData: [{ OPEN, HIGH, LOW, CLOSE, VALUE, CHART_DATE }, ...] }
 *
 * Live-verified: SMPH (cmpy_id=112, security_id=314) for 2018-01-03..2026-08-06
 * returns 2214 bars — far above the 316-bar (252 train + 63 test + 1) minimum the
 * walk-forward backtest needs. `chartData` carries OPEN/HIGH/LOW/CLOSE and a peso
 * `VALUE`, but NOT share volume — so `volume` is inserted as NULL (honest: we do
 * not have share counts). `adjusted_close` is set equal to `close` because this
 * endpoint exposes no adjustment factors (unadjusted close, documented).
 * Note: because the data is unadjusted, genuine corporate actions (e.g. the
 * RRHI +50%/-30% move of 2026-07-08..10, confirmed live from this endpoint)
 * appear as real single-day jumps in the series — source-accurate, not a
 * parsing artifact.
 *
 * Usage:
 *   npx tsx scripts/backfill-pse-history.ts --dry-run            # sample, no writes
 *   npx tsx scripts/backfill-pse-history.ts --limit=5            # 5 symbols, dry-run
 *   npx tsx scripts/backfill-pse-history.ts --symbols=SMPH,BDO   # specific, dry-run
 *   npx tsx scripts/backfill-pse-history.ts --apply              # write to the DB
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { dbAdapter } from '../src/db/index.js';
import { PSEI_SYMBOLS } from '../src/backtest/BenchmarkEngine.js';

const EDGE_BASE = 'https://edge.pse.com.ph';
const CHART_ENDPOINT = `${EDGE_BASE}/common/DisclosureCht.ax`;
const SECTORS_PATH = resolve(process.cwd(), 'data/pse-sectors.json');
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BACKTEST_MIN_BARS = 316; // 252 train + 63 test + 1

const CONCURRENCY = 3;   // polite to PSE EDGE
const DELAY_MS = 750;    // pause between batches

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

interface SectorRecord {
  symbol: string;
  cmpyId?: number | null;
  securityId?: number | null;
  [k: string]: unknown;
}

function loadSectorMap(): Record<string, SectorRecord> {
  try {
    const raw = readFileSync(SECTORS_PATH, 'utf-8');
    return (JSON.parse(raw).results ?? {}) as Record<string, SectorRecord>;
  } catch {
    return {};
  }
}
/** "Jan 03, 2018 00:00:00" -> "2018-01-03" */
function parseChartDate(raw: string): string | null {
  const m = /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4})/.exec((raw || '').trim());
  if (!m) return null;
  const monIdx = MONTHS.indexOf(m[1]);
  if (monIdx < 0) return null;
  const dd = String(Number(m[2])).padStart(2, '0');
  const mm = String(monIdx + 1).padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

/** Date -> "MM-DD-YYYY" as PSE EDGE expects. */
function toEdgeDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}-${dd}-${d.getFullYear()}`;
}

interface Bar {
  trade_date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  adjusted_close: number | null;
  volume: number | null;
}

async function fetchPseHistory(
  cmpyId: number,
  securityId: number,
  startDate: string,
  endDate: string,
): Promise<Bar[]> {
  const res = await fetch(CHART_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    body: JSON.stringify({ cmpy_id: String(cmpyId), security_id: String(securityId), startDate, endDate }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { chartData?: Array<Record<string, unknown>> };
  const rows = json.chartData ?? [];
  const bars: Bar[] = [];
  for (const row of rows) {
    const date = parseChartDate(String(row.CHART_DATE ?? ''));
    if (!date) continue;
    const close = Number(row.CLOSE);
    if (!Number.isFinite(close) || close <= 0) continue;
    bars.push({
      trade_date: date,
      open: Number.isFinite(Number(row.OPEN)) ? Number(Number(row.OPEN).toFixed(4)) : null,
      high: Number.isFinite(Number(row.HIGH)) ? Number(Number(row.HIGH).toFixed(4)) : null,
      low: Number.isFinite(Number(row.LOW)) ? Number(Number(row.LOW).toFixed(4)) : null,
      close: Number(close.toFixed(4)),
      adjusted_close: Number(close.toFixed(4)), // unadjusted — endpoint has no adj factors
      volume: null, // only peso VALUE available, not share volume
    });
  }
  // dedupe by trade_date (keep last), sort ascending
  const byDate = new Map<string, Bar>();
  for (const b of bars) byDate.set(b.trade_date, b);
  return [...byDate.values()].sort((a, b) => (a.trade_date < b.trade_date ? -1 : 1));
}

async function upsertBars(symbol: string, bars: Bar[]): Promise<void> {
  for (const b of bars) {
    // SQLiteAdapter translates INSERT OR REPLACE to `INSERT OR REPLACE` (standard).
    await dbAdapter.query(
      `INSERT OR REPLACE INTO daily_prices (symbol, trade_date, open, high, low, close, adjusted_close, volume)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [symbol, b.trade_date, b.open, b.high, b.low, b.close, b.adjusted_close, b.volume],
    );
  }
}

interface Cli {
  apply: boolean;
  limit?: number;
  years: number;
  symbols?: string[];
}

function parseArgs(argv: string[]): Cli {
  const cli: Cli = { apply: false, years: 6 };
  for (const a of argv) {
    if (a === '--apply') cli.apply = true;
    else if (a === '--dry-run') cli.apply = false;
    else if (a.startsWith('--limit=')) cli.limit = Number(a.split('=')[1]);
    else if (a.startsWith('--years=')) cli.years = Number(a.split('=')[1]);
    else if (a.startsWith('--symbols=')) cli.symbols = a.split('=')[1].split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  }
  return cli;
}

async function main() {
  const cli = parseArgs(process.argv.slice(2));
  await dbAdapter.initialize();
  console.log(`DB adapter: ${dbAdapter.kind} (${cli.apply ? 'APPLY — will write' : 'DRY-RUN — no writes'})`);

  const sectors = loadSectorMap();
  const manual = cli.symbols ?? [];
  const base = manual.length ? manual : PSEI_SYMBOLS;
  const targets = cli.limit ? base.slice(0, cli.limit) : base;

  const endDate = new Date();
  const startDate = new Date(Date.now() - cli.years * 365 * 86400000);
  const startStr = toEdgeDate(startDate);
  const endStr = toEdgeDate(endDate);
  console.log(`Window: ${startStr} .. ${endStr} (${cli.years} years) across ${targets.length} symbols\n`);

  let backfilled = 0, cleared = 0, failed = 0;
  const clearedSymbols: string[] = [];
  const failedSymbols: { s: string; e: string }[] = [];

  for (let i = 0; i < targets.length; i += CONCURRENCY) {
    const batch = targets.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (symbol) => {
        const rec = sectors[symbol];
        const cmpyId = rec?.cmpyId ?? null;
        const securityId = rec?.securityId ?? null;
        if (!cmpyId || !securityId) {
          return { symbol, error: `no cmpyId/securityId in pse-sectors.json` };
        }
        try {
          const bars = await fetchPseHistory(cmpyId, securityId, startStr, endStr);
          if (bars.length === 0) return { symbol, error: `0 bars fetched` };
          if (cli.apply) await upsertBars(symbol, bars);
          const ok = bars.length >= BACKTEST_MIN_BARS;
          return {
            symbol,
            bars: bars.length,
            ok,
            range: `${bars[0].trade_date}..${bars[bars.length - 1].trade_date}`,
          };
        } catch (e) {
          return { symbol, error: e instanceof Error ? e.message : String(e) };
        }
      }),
    );

    for (const r of results) {
      if ('error' in r) {
        failed++;
        failedSymbols.push({ s: r.symbol, e: r.error });
        console.log(`${r.symbol.padEnd(6)} ${String(r.error).padEnd(40)} — FAILED`);
      } else {
        backfilled++;
        const flag = r.ok ? 'OK (>=316)' : 'insufficient data';
        if (r.ok) {
          cleared++;
          clearedSymbols.push(r.symbol);
        }
        console.log(
          `${r.symbol.padEnd(6)} ${String(r.bars).padStart(5)} bars  ${r.range.padEnd(23)}  [${cli.apply ? 'written' : 'dry-run'}] ${flag}`,
        );
      }
    }
    if (i + CONCURRENCY < targets.length) await sleep(DELAY_MS);
  }

  console.log('\n===== SUMMARY =====');
  console.log(`processed   : ${targets.length}`);
  console.log(`backfilled  : ${backfilled}${cli.apply ? '' : ' (dry-run — would write)'}`);
  console.log(`>=316 bars  : ${cleared}`);
  console.log(`failed      : ${failed}`);
  if (cleared > 0) console.log(`cleared set : ${clearedSymbols.join(', ')}`);
  if (failedSymbols.length > 0) {
    console.log('\nFailures:');
    for (const f of failedSymbols) console.log(`  ${f.s.padEnd(6)} ${f.e}`);
  }

  await dbAdapter.shutdown();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exitCode = 1;
});

