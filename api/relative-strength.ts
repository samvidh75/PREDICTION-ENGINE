/**
 * Relative Strength / Price Momentum ranking.
 *
 * Ranks a curated batch of liquid PSE names by REAL price momentum computed
 * from EODHD daily OHLCV (see api/_lib/services/eodhdClient.ts). This is
 * genuinely computable — unlike the fundamentals-based "8-factor" ranking
 * this page used to fake — but it comes with a hard ceiling: EODHD's free
 * tier caps real history at ~1 year, so windows beyond that (e.g. 12-month
 * momentum) are not offered here. Any symbol whose EODHD fetch fails is
 * dropped from the ranking, never backfilled with invented numbers.
 *
 * Batch is PSEI_30 (the PSE's own 30-constituent composite index) rather
 * than the full ~294-ticker universe, to keep this within a single
 * request's time budget and avoid hammering the EODHD rate limit — each
 * symbol's history is cached 6h via the same serverlessCache used by
 * api/stock/[symbol].ts.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { PSEI_30, PSE_STOCKS } from './_lib/data/universe.js';
import { fetchEodhdHistory, type EodhdBar } from './_lib/services/eodhdClient.js';

const symbolToName = new Map(PSE_STOCKS.map((s) => [s.symbol, s.name] as const));

interface MomentumRow {
  symbol: string;
  name: string;
  asOf: string;
  lastClose: number;
  momentum1m: number | null; // 21 trading days
  momentum3m: number | null; // 63 trading days
  momentum6m: number | null; // 126 trading days
  barsAvailable: number;
  dataUnavailable?: boolean;
}

function periodReturn(closes: number[], days: number): number | null {
  if (closes.length < days + 1) return null;
  const start = closes[closes.length - 1 - days];
  const end = closes[closes.length - 1];
  if (!Number.isFinite(start) || start <= 0 || !Number.isFinite(end)) return null;
  return Number((((end / start) - 1) * 100).toFixed(2));
}

function barsToAscendingCloses(bars: EodhdBar[]): { closes: number[]; dates: string[] } {
  const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
  return { closes: sorted.map((b) => b.close), dates: sorted.map((b) => b.date) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600');

  const symbols = PSEI_30;

  const results = await Promise.all(
    symbols.map(async (symbol): Promise<MomentumRow> => {
      const name = symbolToName.get(symbol) || symbol;
      const bars = await fetchEodhdHistory(symbol, 380);
      if (!bars || bars.length === 0) {
        return {
          symbol, name, asOf: '', lastClose: 0,
          momentum1m: null, momentum3m: null, momentum6m: null,
          barsAvailable: 0, dataUnavailable: true,
        };
      }

      const { closes, dates } = barsToAscendingCloses(bars);
      return {
        symbol,
        name,
        asOf: dates[dates.length - 1],
        lastClose: closes[closes.length - 1],
        momentum1m: periodReturn(closes, 21),
        momentum3m: periodReturn(closes, 63),
        momentum6m: periodReturn(closes, 126),
        barsAvailable: closes.length,
      };
    }),
  );

  const available = results.filter((r) => !r.dataUnavailable);
  const unavailable = results.filter((r) => r.dataUnavailable).map((r) => r.symbol);

  // Rank by 3-month momentum where available, falling back to 1-month —
  // never sort by a fabricated/default value.
  const ranked = [...available].sort((a, b) => {
    const av = a.momentum3m ?? a.momentum1m ?? -Infinity;
    const bv = b.momentum3m ?? b.momentum1m ?? -Infinity;
    return bv - av;
  });

  const latestAsOf = available.reduce<string>((max, r) => (r.asOf > max ? r.asOf : max), '');

  res.status(200).json({
    ok: true,
    label: 'Price Momentum Ranking',
    methodology:
      'Ranked by real trailing price returns computed from EODHD daily OHLCV (21/63/126 trading-day windows). ' +
      'This is price-momentum only, not a fundamentals-based relative strength score — no P/E, ROE, or other ' +
      'fundamentals feed exists for these tickers today.',
    dataSourceCap:
      'Historical depth is capped at approximately 1 year by EODHD\'s free-tier plan. ' +
      'No window beyond that is computed or claimed.',
    asOf: latestAsOf || null,
    universe: 'PSEi-30 (PSE composite index constituents)',
    count: ranked.length,
    unavailableSymbols: unavailable,
    rankings: ranked,
  });
}
