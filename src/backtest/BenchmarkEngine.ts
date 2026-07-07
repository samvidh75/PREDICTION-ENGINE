/**
 * TRACK-31 PHASE 2 — Benchmark Engine
 * 
 * Computes benchmark metrics for NIFTY50, NIFTY100, NIFTY500, and Equal Weight Universe
 * using real price data from daily_prices table.
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

// Approximate NIFTY constituent lists (symbols on PSE)
export const NIFTY50_SYMBOLS = [
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR',
  'SBIN', 'BHARTIARTL', 'ITC', 'KOTAKBANK', 'LT', 'BAJFINANCE',
  'ASIANPAINT', 'AXISBANK', 'MARUTI', 'SUNPHARMA', 'TITAN', 'WIPRO',
  'HCLTECH', 'ULTRACEMCO', 'NTPC', 'POWERGRID', 'ADANIPORTS',
  'ADANIENT', 'NESTLEIND', 'TECHM', 'ONGC', 'DRREDDY', 'COALINDIA',
  'JSWSTEEL', 'TATAMOTORS', 'GRASIM', 'BAJAJFINSV', 'TATASTEEL',
  'HDFCLIFE', 'SBILIFE', 'EICHERMOT', 'DIVISLAB', 'APOLLOHOSP',
  'BPCL', 'BRITANNIA', 'CIPLA', 'HEROMOTOCO', 'HINDALCO',
  'INDUSINDBK', 'M&M', 'TATACONSUM', 'UPL', 'BAJAJ-AUTO', 'SHREECEM',
];

export const NIFTY100_SYMBOLS = [
  ...NIFTY50_SYMBOLS,
  'ABB', 'ADANIGREEN', 'ADANITRANS', 'ALKEM', 'AMBUJACEM',
  'AUROPHARMA', 'BANDHANBNK', 'BANKBARODA', 'BERGEPAINT',
  'BIOCON', 'BOSCHLTD', 'CADILAHC', 'CANBK', 'CHOLAFIN',
  'COLPAL', 'CONCOR', 'DABUR', 'DLF', 'FEDERALBNK', 'GAIL',
  'GODREJCP', 'HAVELLS', 'HDFCAMC', 'HONAUT', 'ICICIPRULI',
  'IGL', 'INDUSTOWER', 'IOC', 'JUBLFOOD', 'LICHSGFIN',
  'LUPIN', 'M&MFIN', 'MARICO', 'MUTHOOTFIN', 'NAUKRI',
  'NAVINFLUOR', 'NIACL', 'NMDC', 'PAGEIND', 'PEL',
  'PETRONET', 'PIDILITIND', 'PFC', 'PNB', 'RAMCOCEM',
  'SBICARD', 'SRTRANSFIN', 'TORNTPHARM', 'TVSMOTOR', 'VEDL',
];

const NIFTY500_SYMBOLS: string[] = []; // Discovered from registry

export class BenchmarkEngine {
  /**
   * Fetch daily prices for the given symbols within a date range.
   * Returns close prices grouped by trade_date, averaged across symbols.
   */
  private async fetchIndexPrices(
    symbols: string[],
    startDate: string,
    endDate: string
  ): Promise<{ dates: string[]; prices: number[]; returns: number[] }> {
    // Get all prices for requested symbols
    const result = await query(
      `SELECT trade_date, AVG(adjusted_close) as avg_close
       FROM daily_prices
       WHERE symbol = ANY($1)
         AND trade_date BETWEEN $2 AND $3
       GROUP BY trade_date
       ORDER BY trade_date`,
      [symbols, startDate, endDate]
    );

    const rows = result.rows;
    const dates: string[] = [];
    const prices: number[] = [];
    const returns: number[] = [];

    for (let i = 0; i < rows.length; i++) {
      dates.push(rows[i].trade_date.toISOString().split('T')[0]);
      const price = parseFloat(rows[i].avg_close);
      prices.push(price);
      if (i > 0 && prices[i - 1] > 0) {
        returns.push((price - prices[i - 1]) / prices[i - 1]);
      }
    }

    return { dates, prices, returns };
  }

  private computeMetrics(returns: number[], days: number, totalReturn: number): BenchmarkMetrics {
    const annVol = annualizedVolatility(returns);
    const annRet = annualizedReturn(totalReturn, days);
    const monthlyReturns: number[] = [];
    // Approximate monthly returns from daily
    for (let i = 0; i < returns.length; i += 21) {
      const chunk = returns.slice(i, i + 21);
      if (chunk.length > 0) {
        const chunkRet = chunk.reduce((a, b) => a + b, 0);
        monthlyReturns.push(chunkRet);
      }
    }
    const positiveMonths = monthlyReturns.filter(r => r > 0).length;

    return {
      cagr: annRet,
      sharpe: sharpeRatio(annRet, annVol),
      sortino: sortinoRatio(returns),
      maxDrawdown: maxDrawdown(this.computeEquityCurve(returns)),
      volatility: annVol,
      totalReturn,
      positiveMonths,
      totalMonths: monthlyReturns.length,
      winRate: monthlyReturns.length > 0 ? positiveMonths / monthlyReturns.length : 0,
    };
  }

  private computeEquityCurve(returns: number[]): number[] {
    const curve = [1];
    for (const r of returns) {
      curve.push(curve[curve.length - 1] * (1 + r));
    }
    return curve;
  }

  async computeBenchmark(
    index: BenchmarkIndex,
    startDate: string,
    endDate: string
  ): Promise<BenchmarkResult> {
    let symbols: string[];

    switch (index) {
      case 'NIFTY50':
        symbols = NIFTY50_SYMBOLS;
        break;
      case 'NIFTY100':
        symbols = NIFTY100_SYMBOLS;
        break;
      case 'NIFTY500':
      case 'EQUAL_WEIGHT_UNIVERSE': {
        const regResult = await query(
          `SELECT symbol FROM master_security_registry
           WHERE listing_status = 'Active'
           ORDER BY symbol`
        );
        symbols = regResult.rows.map(r => r.symbol);
        if (index === 'NIFTY500') {
          symbols = symbols.slice(0, 500);
        }
        break;
      }
    }

    const { dates, prices, returns } = await this.fetchIndexPrices(symbols, startDate, endDate);

    if (prices.length < 2) {
      return {
        index,
        metrics: {
          cagr: 0, sharpe: 0, sortino: 0, maxDrawdown: 0,
          volatility: 0, totalReturn: 0, positiveMonths: 0, totalMonths: 0, winRate: 0,
        },
        periodStart: startDate,
        periodEnd: endDate,
        constituents: symbols.length,
      };
    }

    const totalReturn = (prices[prices.length - 1] - prices[0]) / prices[0];
    const days = dates.length;

    return {
      index,
      metrics: this.computeMetrics(returns, days, totalReturn),
      periodStart: dates[0],
      periodEnd: dates[dates.length - 1],
      constituents: symbols.length,
    };
  }

  async computeAllBenchmarks(
    startDate: string,
    endDate: string
  ): Promise<BenchmarkResult[]> {
    const indices: BenchmarkIndex[] = ['NIFTY50', 'NIFTY100', 'NIFTY500', 'EQUAL_WEIGHT_UNIVERSE'];
    const results: BenchmarkResult[] = [];

    for (const idx of indices) {
      const result = await this.computeBenchmark(idx, startDate, endDate);
      results.push(result);
    }

    return results;
  }
}

export const benchmarkEngine = new BenchmarkEngine();
