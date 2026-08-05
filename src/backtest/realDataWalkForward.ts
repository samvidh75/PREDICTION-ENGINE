// src/backtest/realDataWalkForward.ts
// Real-data walk-forward backtesting: loads actual PSE bars from the
// `daily_prices` table and runs the anti-lookahead WalkForwardValidator on
// them per symbol. This moves the backtest pipeline from simulated/1-year
// EODHD-free-tier data onto whatever real multi-year history is in the DB,
// and reports honest "insufficient data" outcomes instead of fabricating.

import { query } from "../db/index";
import { WalkForwardValidator, type WalkForwardConfig } from "../services/backtest/WalkForwardValidator";
import { PSEI_SYMBOLS } from "./BenchmarkEngine";
import { buildBacktestBars, momentumStrategy } from "./walkForwardStrategies";
import type { DailyPriceRow } from "./walkForwardStrategies";

export const DEFAULT_WALK_FORWARD_CONFIG: WalkForwardConfig = {
  trainWindowDays: 252,
  testWindowDays: 63,
  stepDays: 21,
};

export interface RealWalkForwardResult {
  symbol: string;
  bars: number;
  dataStart: string | null;
  dataEnd: string | null;
  windows: number;
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  winRate: number;
  sharpeRatio: number;
  volatilityAnnualized: number;
  error?: string;
}

export async function fetchDailyPrices(symbol: string): Promise<DailyPriceRow[]> {
  const res = await query<DailyPriceRow>(
    `SELECT trade_date, adjusted_close FROM daily_prices WHERE symbol = $1 ORDER BY trade_date ASC`,
    [symbol],
  );
  return res.rows;
}

/**
 * Run walk-forward validation for one symbol using real daily_prices data.
 * Never fabricates: if there isn't enough real history for at least one
 * train+test window, the result reports `windows: 0` and an `error`.
 */
export async function runRealWalkForward(
  symbol: string,
  config: WalkForwardConfig = DEFAULT_WALK_FORWARD_CONFIG,
): Promise<RealWalkForwardResult> {
  try {
    const bars = buildBacktestBars(await fetchDailyPrices(symbol));
    const dataStart = bars.length > 0 ? bars[0].date : null;
    const dataEnd = bars.length > 0 ? bars[bars.length - 1].date : null;

    if (bars.length < config.trainWindowDays + config.testWindowDays + 1) {
      return {
        symbol, bars: bars.length, dataStart, dataEnd, windows: 0,
        totalReturnPct: 0, annualizedReturnPct: 0, maxDrawdownPct: 0,
        winRate: 0, sharpeRatio: 0, volatilityAnnualized: 0,
        error: `insufficient data (${bars.length} bars; need ${config.trainWindowDays + config.testWindowDays + 1})`,
      };
    }

    const result = new WalkForwardValidator(config).validate(bars, momentumStrategy);
    const m = result.aggregateOutOfSample;
    return {
      symbol, bars: bars.length, dataStart, dataEnd,
      windows: result.windows.length,
      totalReturnPct: m.totalReturnPct,
      annualizedReturnPct: m.annualizedReturnPct,
      maxDrawdownPct: m.maxDrawdownPct,
      winRate: m.winRate,
      sharpeRatio: m.sharpeRatio,
      volatilityAnnualized: m.volatilityAnnualized,
    };
  } catch (e) {
    return {
      symbol, bars: 0, dataStart: null, dataEnd: null, windows: 0,
      totalReturnPct: 0, annualizedReturnPct: 0, maxDrawdownPct: 0,
      winRate: 0, sharpeRatio: 0, volatilityAnnualized: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Run real walk-forward across a universe of symbols, returning each symbol's
 * result plus summary stats over the symbols that actually produced windows.
 */
export async function runRealUniverseWalkForward(
  symbols: string[] = PSEI_SYMBOLS,
  config?: WalkForwardConfig,
): Promise<{ results: RealWalkForwardResult[]; withData: number; withWindows: number }> {
  const results: RealWalkForwardResult[] = [];
  for (const symbol of symbols) {
    results.push(await runRealWalkForward(symbol, config));
  }
  return {
    results,
    withData: results.filter((r) => r.bars > 0).length,
    withWindows: results.filter((r) => r.windows > 0).length,
  };
}
