/**
 * Backtest API — honest, real-data-only illustrative strategy backtest.
 *
 * Data: EODHD daily OHLCV for PSE tickers (api/_lib/services/eodhdClient.ts).
 * EODHD's free tier caps real history at ~1 year (the raw response itself
 * carries a "Data is limited by one year as you have free subscription"
 * warning) — so every backtest this route produces covers AT MOST ~1 year
 * of real bars. That window is returned explicitly in `dataWindow` and must
 * be surfaced prominently by the client; never let a caller imply more
 * history than was actually fetched.
 *
 * Strategy: a plain SMA-50 crossover (long when price > 50-day simple
 * moving average, flat otherwise), applied per-symbol and equal-weighted
 * across whichever symbols have enough real bars. This is a simple,
 * fully-disclosed illustrative example — not an optimized or recommended
 * trading strategy, and not a Buy/Sell/Hold call on any name (see
 * src/services/risk/ComplianceSelfCheckService.ts for why this app avoids
 * that framing).
 *
 * Metrics reuse the existing real computeMetrics() from
 * src/services/backtest/PerformanceMetrics.ts — CAGR-equivalent
 * (annualizedReturnPct), max drawdown, win rate, Sharpe, etc. — all
 * derived from the real return series the strategy actually produced.
 * Nothing here is fabricated; symbols with insufficient/unavailable data
 * are excluded and reported, never backfilled.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchEodhdHistory, type EodhdBar } from './_lib/services/eodhdClient.js';
import { PSEI_30, PSE_STOCKS } from './_lib/data/universe.js';
import { computeMetrics } from '../src/services/backtest/PerformanceMetrics.js';

const SMA_WINDOW = 50;
const DEFAULT_SYMBOLS = PSEI_30.slice(0, 12); // curated, liquid, real PSEi names
const MAX_SYMBOLS = 20;
const MIN_BARS_REQUIRED = SMA_WINDOW + 20; // need enough bars for a meaningful post-SMA test window

interface SymbolResult {
  symbol: string;
  name: string;
  included: boolean;
  reason?: string;
  barsUsed?: number;
  trades?: number;
  returns?: number[]; // daily net returns, oldest first, aligned to dates below
  dates?: string[];
}

function sma(values: number[], i: number, window: number): number | null {
  if (i < window - 1) return null;
  let sum = 0;
  for (let k = i - window + 1; k <= i; k++) sum += values[k];
  return sum / window;
}

/**
 * Run the SMA-50 crossover over one symbol's real daily bars.
 * Returns per-day net returns (only earned while the position is long;
 * a fixed 5bps round-trip cost is charged on every position flip) plus
 * the trade count. Position is decided using data available *through*
 * the prior bar close only — no lookahead.
 */
function runSmaCrossover(bars: EodhdBar[]): { returns: number[]; dates: string[]; trades: number } {
  const closes = bars.map((b) => b.close);
  const dates = bars.map((b) => b.date);
  const costBps = 5 / 10_000;

  let position = 0; // 0 = flat, 1 = long
  let trades = 0;
  const returns: number[] = [];
  const returnDates: string[] = [];

  for (let i = SMA_WINDOW; i < closes.length; i++) {
    const priorSma = sma(closes, i - 1, SMA_WINDOW);
    const desiredPosition = priorSma !== null && closes[i - 1] > priorSma ? 1 : 0;

    let dailyReturn = position === 1 ? closes[i] / closes[i - 1] - 1 : 0;

    if (desiredPosition !== position) {
      dailyReturn -= costBps; // round-trip cost charged on the flip day
      trades += 1;
      position = desiredPosition;
    }

    returns.push(dailyReturn);
    returnDates.push(dates[i]);
  }

  return { returns, dates: returnDates, trades };
}

function resolveSymbols(req: VercelRequest): string[] {
  const q = req.query?.symbols;
  if (!q) return DEFAULT_SYMBOLS;
  const raw = Array.isArray(q) ? q.join(',') : String(q);
  const requested = raw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const validSet = new Set(PSE_STOCKS.map((s) => s.symbol));
  const filtered = requested.filter((s) => validSet.has(s));
  return (filtered.length > 0 ? filtered : DEFAULT_SYMBOLS).slice(0, MAX_SYMBOLS);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Content-Type', 'application/json');

  try {
    const symbols = resolveSymbols(req);
    const nameBySymbol = new Map(PSE_STOCKS.map((s) => [s.symbol, s.name]));

    const perSymbol: SymbolResult[] = await Promise.all(
      symbols.map(async (symbol): Promise<SymbolResult> => {
        const name = nameBySymbol.get(symbol) ?? symbol;
        const bars = await fetchEodhdHistory(symbol, 380);

        if (!bars || bars.length < MIN_BARS_REQUIRED) {
          return {
            symbol,
            name,
            included: false,
            reason: !bars
              ? 'No historical price data available'
              : `Only ${bars.length} bars available (need at least ${MIN_BARS_REQUIRED})`,
          };
        }

        const sorted = [...bars].sort((a, b) => a.date.localeCompare(b.date));
        const { returns, dates, trades } = runSmaCrossover(sorted);

        if (returns.length === 0) {
          return { symbol, name, included: false, reason: 'No tradable bars after warm-up window' };
        }

        return { symbol, name, included: true, barsUsed: sorted.length, trades, returns, dates };
      }),
    );

    const included = perSymbol.filter((s) => s.included && s.returns && s.dates);
    const excluded = perSymbol
      .filter((s) => !s.included)
      .map(({ symbol, name, reason }) => ({ symbol, name, reason }));

    if (included.length === 0) {
      res.status(503).json({
        ok: false,
        error: 'Backtest temporarily unavailable — no symbols had sufficient real historical data.',
        excluded,
      });
      return;
    }

    // Equal-weight combine: on each real trading date shared across all
    // included symbols' return series, average the per-symbol net returns.
    // Dates are aligned by intersection so no symbol's missing day is
    // silently treated as a zero return for another symbol.
    const dateSets = included.map((s) => new Set(s.dates!));
    const commonDates = [...dateSets[0]].filter((d) => dateSets.every((set) => set.has(d))).sort();

    const returnsBySymbolDate = included.map((s) => {
      const map = new Map<string, number>();
      s.dates!.forEach((d, idx) => map.set(d, s.returns![idx]));
      return map;
    });

    const portfolioReturns: number[] = commonDates.map((date) => {
      const dayReturns = returnsBySymbolDate.map((m) => m.get(date)!);
      return dayReturns.reduce((sum, r) => sum + r, 0) / dayReturns.length;
    });

    const equityCurve: Array<{ date: string; value: number }> = [];
    let equity = 1;
    commonDates.forEach((date, i) => {
      equity *= 1 + portfolioReturns[i];
      equityCurve.push({ date, value: equity });
    });

    const metrics = computeMetrics(portfolioReturns);
    const totalTrades = included.reduce((sum, s) => sum + (s.trades ?? 0), 0);

    const startDate = commonDates[0] ?? null;
    const endDate = commonDates[commonDates.length - 1] ?? null;

    res.status(200).json({
      ok: true,
      strategy: {
        name: 'SMA-50 crossover (illustrative example only)',
        description:
          'Long when yesterday\'s close was above its trailing 50-day simple moving average, flat otherwise. Equal-weighted across included symbols, rebalanced daily. A 5bps cost is charged on every position change.',
        disclaimer:
          'This is a simple illustrative example for research purposes only — not an optimized or recommended trading strategy, and not investment advice. It is not a Buy, Sell, or Hold recommendation on any security.',
      },
      dataWindow: {
        startDate,
        endDate,
        tradingDays: commonDates.length,
        dataSource: 'EODHD',
        limitation:
          'Historical data is capped at approximately one year by the free-tier data plan. This backtest covers only that ~1-year window, not a longer track record.',
      },
      universe: {
        requested: symbols.length,
        included: included.map((s) => ({ symbol: s.symbol, name: s.name, barsUsed: s.barsUsed, trades: s.trades })),
        excluded,
      },
      metrics: {
        totalReturnPct: metrics.totalReturnPct,
        annualizedReturnPct: metrics.annualizedReturnPct,
        sharpeRatio: metrics.sharpeRatio,
        sortinoRatio: metrics.sortinoRatio,
        maxDrawdownPct: metrics.maxDrawdownPct,
        maxDrawdownDurationDays: metrics.maxDrawdownDurationDays,
        winRate: metrics.winRate,
        volatilityAnnualized: metrics.volatilityAnnualized,
        numPeriods: metrics.numPeriods,
        totalTrades,
      },
      equityCurve,
      pastPerformanceDisclaimer:
        'Past performance, even when computed from real historical prices as here, does not predict future results.',
    });
  } catch (error) {
    console.error('[api/backtest] failed:', error);
    res.status(503).json({ ok: false, error: 'Backtest temporarily unavailable.' });
  }
}
