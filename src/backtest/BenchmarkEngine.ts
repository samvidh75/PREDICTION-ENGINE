/**
 * TRACK-31 PHASE 2 — Benchmark Engine
 *
 * Computes benchmark metrics for PSEi, PSEi Top 10, PSE All Shares, and
 * Equal Weight Universe using real price data from daily_prices table.
 */

import { query } from '../db/index';
import type {
  BenchmarkIndex,
  BenchmarkMetrics,
  BenchmarkResult,
} from './types';
import {
  annualizedReturn,
  annualizedVolatility,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
} from './types';

// PSEi (PSE Index) constituent list — PSE-listed symbols
export const PSEI_SYMBOLS = [
  'SM', 'SMPH', 'AC', 'ALI', 'BDO',
  'BPI', 'MBT', 'ICT', 'JFC', 'URC',
  'AEV', 'MER', 'TEL', 'GLO', 'LTG',
  'MPI', 'AGI', 'GTCAP', 'JGS', 'SECB',
  'CNPF', 'EMI', 'WLCON', 'MONDE', 'PGOLD',
  'RRHI', 'RLC', 'DMC', 'ACEN', 'BLOOM',
];

export const PSE_ALL_SYMBOLS = [
  ...PSEI_SYMBOLS,
  'AP', 'FGEN', 'MWIDE', 'ANI', 'CEB',
  'DD', 'FLI', 'HLCM', 'IMI', 'MEG',
  'NIKL', 'PCOR', 'PXP', 'ROCK', 'SCC',
  'SSI', 'TFHI', 'VLL', 'CHP',
];

export const PSEI_TOP_10_SYMBOLS = PSEI_SYMBOLS.slice(0, 10);

/**
 * Compute benchmark metrics for a given index.
 */
export async function computeBenchmark(
  index: BenchmarkIndex,
  startDate: string,
  endDate: string
): Promise<BenchmarkResult> {
  let symbols: string[];

  switch (index) {
    case 'PSEI':
      symbols = PSEI_SYMBOLS;
      break;
    case 'PSEI_TOP_10':
      symbols = PSEI_TOP_10_SYMBOLS;
      break;
    case 'PSE_ALL':
      symbols = PSE_ALL_SYMBOLS;
      break;
    case 'EQUAL_WEIGHT_UNIVERSE':
      symbols = PSE_ALL_SYMBOLS;
      break;
  }

  const prices = await fetchBenchmarkPrices(symbols, startDate, endDate);
  const returns = computeReturns(prices);
  const metrics = computeMetrics(returns, index);

  return {
    index,
    metrics,
    periodStart: startDate,
    periodEnd: endDate,
    constituents: symbols.length,
  };
}

async function fetchBenchmarkPrices(
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<Record<string, number[]>> {
  const prices: Record<string, number[]> = {};
  for (const sym of symbols) {
    const result = await query(
      `SELECT close_price FROM daily_prices WHERE symbol = $1 AND date >= $2 AND date <= $3 ORDER BY date`,
      [sym, startDate, endDate]
    );
    prices[sym] = result.rows.map((r: any) => r.close_price);
  }
  return prices;
}

function computeReturns(prices: Record<string, number[]>): number[] {
  const allReturns: number[] = [];
  const symbols = Object.keys(prices);
  const minLen = Math.min(...Object.values(prices).map(p => p.length));
  if (minLen < 2) return [];

  for (let i = 1; i < minLen; i++) {
    let dayReturn = 0;
    for (const sym of symbols) {
      const p = prices[sym];
      if (p.length > i && p[i - 1] > 0) {
        dayReturn += (p[i] - p[i - 1]) / p[i - 1];
      }
    }
    allReturns.push(dayReturn / symbols.length);
  }
  return allReturns;
}

function computeMetrics(returns: number[], index: BenchmarkIndex): BenchmarkMetrics {
  if (returns.length === 0) {
    return {
      cagr: 0, sharpe: 0, sortino: 0, maxDrawdown: 0,
      volatility: 0, totalReturn: 0, positiveMonths: 0,
      totalMonths: 0, winRate: 0,
    };
  }

  const totalReturn = returns.reduce((a, b) => a * (1 + b), 1) - 1;
  const cagr = annualizedReturn(totalReturn, returns.length);
  const volatility = annualizedVolatility(returns);
  const sharpe = sharpeRatio(cagr, volatility, 0.06); // PHP risk-free ~6% (PH T-bill)
  const sortino = sortinoRatio(returns, 0.06);
  const equityCurve = returns.reduce<number[]>((curve, r) => {
    const prev = curve.length > 0 ? curve[curve.length - 1] : 1;
    curve.push(prev * (1 + r));
    return curve;
  }, []);
  const drawdown = maxDrawdown(equityCurve);

  const positiveMonths = returns.filter(r => r > 0).length;
  const totalMonths = returns.length;
  const winRate = totalMonths > 0 ? (positiveMonths / totalMonths) * 100 : 0;

  return {
    cagr: cagr * 100,
    sharpe,
    sortino,
    maxDrawdown: drawdown * 100,
    volatility: volatility * 100,
    totalReturn: totalReturn * 100,
    positiveMonths,
    totalMonths,
    winRate,
  };
}

/**
 * Compute benchmarks for all indices.
 */
export async function computeAllBenchmarks(
  startDate: string,
  endDate: string
): Promise<BenchmarkResult[]> {
  const indices: BenchmarkIndex[] = ['PSEI', 'PSEI_TOP_10', 'PSE_ALL', 'EQUAL_WEIGHT_UNIVERSE'];
  const results: BenchmarkResult[] = [];

  for (const index of indices) {
    try {
      const result = await computeBenchmark(index, startDate, endDate);
      results.push(result);
    } catch (error) {
      console.error(`Failed to compute benchmark for ${index}:`, error);
    }
  }

  return results;
}

/** Object wrapper so callers can `import { benchmarkEngine }` and bind its methods. */
export const benchmarkEngine = {
  computeBenchmark,
  computeAllBenchmarks,
};
