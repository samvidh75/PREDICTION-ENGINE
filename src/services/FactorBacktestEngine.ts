// src/services/FactorBacktestEngine.ts
// Production Factor Backtest Engine.
// Evaluates historical factor performance (correlation, win rate, Sharpe ratio, and Information ratio).

import { query } from "../db/index";

export interface BacktestResult {
  factor: string;
  correlation: number;
  win_rate: number;
  information_ratio: number;
  sharpe_ratio: number;
}

export class FactorBacktestEngine {
  async runBacktest(symbol: string): Promise<BacktestResult[]> {
    // 1. Fetch factor snapshots and daily prices
    const factorsRes = await query(
      `SELECT trade_date, quality_factor, value_factor, growth_factor, momentum_factor, risk_factor, sector_strength_factor, factor_score
       FROM factor_snapshots
       WHERE symbol = $1
       ORDER BY trade_date ASC`,
      [symbol]
    );

    const pricesRes = await query(
      `SELECT trade_date::text as date, close
       FROM daily_prices
       WHERE symbol = $1
       ORDER BY trade_date ASC`,
      [symbol]
    );

    const factors = factorsRes.rows;
    const prices = pricesRes.rows;

    if (factors.length < 50 || prices.length < 50) {
      return [];
    }

    const factorNames = [
      "quality_factor",
      "value_factor",
      "growth_factor",
      "momentum_factor",
      "risk_factor",
      "sector_strength_factor",
      "factor_score",
    ];

    const results: BacktestResult[] = [];

    // Map date to price index for fast lookup
    const dateToIndex = new Map<string, number>();
    prices.forEach((p, idx) => {
      dateToIndex.set(p.trade_date ? p.trade_date.toISOString().split("T")[0] : p.date, idx);
    });

    const lookAhead = 30; // 30-day forward return as the benchmark target

    for (const factorName of factorNames) {
      const factorValues: number[] = [];
      const forwardReturns: number[] = [];
      const activeReturns: number[] = [];

      for (let i = 0; i < factors.length; i++) {
        const f = factors[i];
        const dateStr = f.trade_date.toISOString().split("T")[0];
        const priceIdx = dateToIndex.get(dateStr);

        if (priceIdx !== undefined && priceIdx + lookAhead < prices.length) {
          const closeToday = Number(prices[priceIdx].close);
          const closeFuture = Number(prices[priceIdx + lookAhead].close);
          
          const forwardReturn = (closeFuture - closeToday) / closeToday;
          const factorValue = Number(f[factorName]);

          factorValues.push(factorValue);
          forwardReturns.push(forwardReturn);

          // Active return = Forward return - market risk-free rate proxy (e.g. 6% annualized, which is ~0.005 for 30-day)
          activeReturns.push(forwardReturn - 0.005);
        }
      }

      if (factorValues.length < 10) continue;

      // 1. Calculate Correlation (Information Coefficient)
      const correlation = this.calculateCorrelation(factorValues, forwardReturns);

      // 2. Win Rate: Percentage of periods where factor > 50 leads to positive return
      let positiveCount = 0;
      let totalCount = 0;
      for (let j = 0; j < factorValues.length; j++) {
        if (factorValues[j] > 50) {
          totalCount++;
          if (forwardReturns[j] > 0) {
            positiveCount++;
          }
        }
      }
      const winRate = totalCount > 0 ? positiveCount / totalCount : 0.5;

      // 3. Sharpe Ratio of the factor signal (annualized returns / standard deviation)
      const meanActive = activeReturns.reduce((a, b) => a + b, 0) / activeReturns.length;
      const varianceActive = activeReturns.reduce((a, b) => a + Math.pow(b - meanActive, 2), 0) / activeReturns.length;
      const stdDevActive = Math.sqrt(varianceActive) || 0.01;
      // Annualize from 30-day periods (~12 periods in a year)
      const sharpeRatio = (meanActive / stdDevActive) * Math.sqrt(12);

      // 4. Information Ratio (excess return / tracking error)
      const trackingError = stdDevActive;
      const informationRatio = trackingError > 0 ? (meanActive / trackingError) * Math.sqrt(12) : 0;

      results.push({
        factor: this.formatFactorName(factorName),
        correlation: Math.round(correlation * 1000) / 1000,
        win_rate: Math.round(winRate * 1000) / 1000,
        information_ratio: Math.round(informationRatio * 1000) / 1000,
        sharpe_ratio: Math.round(sharpeRatio * 1000) / 1000,
      });
    }

    return results;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      num += diffX * diffY;
      denX += diffX * diffX;
      denY += diffY * diffY;
    }

    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
  }

  private formatFactorName(col: string): string {
    return col
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}

export const factorBacktestEngine = new FactorBacktestEngine();
export default factorBacktestEngine;
