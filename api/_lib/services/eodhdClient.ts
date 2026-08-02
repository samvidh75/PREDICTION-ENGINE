/**
 * EODHD historical price client.
 *
 * The EODHD_KEY in .env has been configured but never actually called
 * anywhere in this codebase — a live test against the real key showed the
 * free tier returns "Only EOD data allowed for free users" for the
 * /fundamentals/ endpoint, but the /eod/ (end-of-day historical price)
 * endpoint works fine for real PSE tickers (verified live against SM.PSE).
 * So: no free real-time fundamentals (P/E, ROE, etc.) from this provider,
 * but real historical daily OHLCV — which is exactly what's needed to
 * compute an honest 52-week high/low and a real price chart, both of which
 * were previously hardcoded to null/empty with a "no historical series"
 * comment. Fundamentals-shaped fields (P/E, ROE, debt/equity, etc.) still
 * have no free data source and must stay null rather than be guessed at.
 */

import { cacheGet, cacheSet } from '../serverlessCache.js';

export interface EodhdBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose: number;
  volume: number;
}

export interface FiftyTwoWeekRange {
  high: number;
  low: number;
}

const EODHD_BASE_URL = 'https://eodhd.com/api/eod';
const CACHE_TTL_SECONDS = 6 * 3600; // 6 hours — EOD data only changes once/day, this just bounds rate-limit exposure

// The PSEi composite index is an index, not an equity — EODHD serves it
// under the .INDX suffix (verified live), not .PSE like ordinary stocks.
const INDEX_SYMBOLS = new Set(['PSEI']);

function toEodhdSymbol(symbol: string): string {
  const clean = symbol.toUpperCase().trim().replace(/\.(PSE|INDX)$/i, '');
  return INDEX_SYMBOLS.has(clean) ? `${clean}.INDX` : `${clean}.PSE`;
}

/**
 * Fetch up to `days` of historical daily bars for a PSE symbol.
 * Returns null on any failure (network, rate limit, unknown symbol,
 * missing API key) rather than throwing — callers should treat a null
 * result as "historical data unavailable," not surface it as an error.
 */
export async function fetchEodhdHistory(symbol: string, days = 380): Promise<EodhdBar[] | null> {
  const apiKey = process.env.EODHD_KEY;
  if (!apiKey) return null;

  const cacheKey = `eodhd:history:${symbol.toUpperCase()}:${days}`;
  const cached = await cacheGet<EodhdBar[]>(cacheKey);
  if (cached) return cached;

  try {
    const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const url = `${EODHD_BASE_URL}/${encodeURIComponent(toEodhdSymbol(symbol))}?api_token=${apiKey}&fmt=json&period=d&order=d&from=${from}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const raw = await response.json() as unknown;
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // A free-tier rejection comes back as a JSON object with an error
    // string, not an array — the Array.isArray check above already
    // guards against that, but be defensive about row shape too.
    const bars: EodhdBar[] = raw
      .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
      .map((row) => ({
        date: String(row.date ?? ''),
        open: Number(row.open ?? 0),
        high: Number(row.high ?? 0),
        low: Number(row.low ?? 0),
        close: Number(row.close ?? 0),
        adjustedClose: Number(row.adjusted_close ?? row.close ?? 0),
        volume: Number(row.volume ?? 0),
      }))
      .filter((bar) => bar.date && Number.isFinite(bar.close) && bar.close > 0);

    if (bars.length === 0) return null;

    await cacheSet(cacheKey, bars, CACHE_TTL_SECONDS);
    return bars;
  } catch (error) {
    console.error(`[eodhdClient] History fetch failed for ${symbol}:`, error);
    return null;
  }
}

/** Compute a real 52-week high/low from up to a year of daily bars. */
export function computeFiftyTwoWeekRange(bars: EodhdBar[]): FiftyTwoWeekRange | null {
  const cutoff = Date.now() - 365 * 86400000;
  const inWindow = bars.filter((bar) => new Date(bar.date).getTime() >= cutoff);
  if (inWindow.length === 0) return null;

  const highs = inWindow.map((bar) => bar.high).filter((v) => Number.isFinite(v) && v > 0);
  const lows = inWindow.map((bar) => bar.low).filter((v) => Number.isFinite(v) && v > 0);
  if (highs.length === 0 || lows.length === 0) return null;

  return { high: Math.max(...highs), low: Math.min(...lows) };
}

/** Convenience: bars formatted for a frontend price chart (oldest first). */
export function toChartSeries(bars: EodhdBar[]): Array<{ date: string; close: number; volume: number }> {
  return [...bars]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((bar) => ({ date: bar.date, close: bar.close, volume: bar.volume }));
}
