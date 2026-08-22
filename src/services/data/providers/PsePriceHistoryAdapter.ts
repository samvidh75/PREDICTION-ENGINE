/**
 * PSE Daily Price History Provider
 *
 * Reads data/pse-price-history.json (built by scripts/backfill-price-history.ts
 * from PHISIX's dated endpoint — free, unmetered, no credentials).
 *
 * This is what makes the momentum factor scoreable. Every other free source
 * failed: EODHD serves real history but caps the free tier at 20 requests a
 * day against 282 symbols, Twelve Data has no PSE coverage, Yahoo's `.PS`
 * suffix resolves PSE tickers to unrelated instruments, and Stooq now sits
 * behind a bot challenge.
 *
 * Candles carry date, close and volume — PHISIX's historical responses publish
 * no open/high/low, so those are null rather than back-filled from the close,
 * which would invent an intraday range that never existed.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { HistoricalPoint } from '../types';

interface StoredCandle {
  date: string;
  close: number;
  volume: number;
}

type HistoryMap = Record<string, StoredCandle[]>;

let cache: HistoryMap | null = null;

function loadMap(): HistoryMap {
  if (cache !== null) return cache;
  let loaded: HistoryMap = {};
  try {
    const raw = readFileSync(resolve(process.cwd(), 'data/pse-price-history.json'), 'utf-8');
    loaded = JSON.parse(raw).results ?? {};
  } catch {
    // Not backfilled yet — momentum simply stays unrated.
  }
  cache = loaded;
  return loaded;
}

/**
 * Daily history for a symbol, oldest first, in the shape the scoring engine
 * consumes. Open/high/low are null because the source does not publish them.
 */
export function getPriceHistory(symbol: string): HistoricalPoint[] {
  const series = loadMap()[symbol.toUpperCase()] ?? [];
  return series
    .filter((c) => typeof c.close === 'number' && Number.isFinite(c.close))
    .map((c) => ({
      date: c.date,
      open: null as unknown as number,
      high: null as unknown as number,
      low: null as unknown as number,
      close: c.close,
      volume: c.volume ?? 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Number of stored bars — 20 is the price-trend threshold, 60 the medium term. */
export function getHistoryDepth(symbol: string): number {
  return (loadMap()[symbol.toUpperCase()] ?? []).length;
}

/** Clears the module cache so a regenerated file is picked up. */
export function reloadPriceHistory(): void {
  cache = null;
}
