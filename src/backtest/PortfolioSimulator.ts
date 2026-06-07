/**
 * TRACK-31 PHASE 3 — Portfolio Simulator
 * 
 * Simulates different portfolio strategies using historical rankings.
 * Strategies: Top 10, Top 20, Top 50, Sector-Balanced Top 20, Confidence-Weighted
 * Rebalancing: Weekly, Monthly, Quarterly
 */

import { query } from '../db/index';
import type {
  StrategyType,
  RebalanceFrequency,
  StrategyResult,
  BenchmarkMetrics,
  BacktestStockSnapshot,
} from './types';
import {
  annualizedReturn,
  annualizedVolatility,
  sharpeRatio,
  sortinoRatio,
  maxDrawdown,
} from './types';

export class PortfolioSimulator {
  /**
   * Fetch ranked stocks from factor_snapshots at a specific date.
   * Returns them sorted by factor_score descending.
   */
  private async fetchRankedStocks(
    snapshotDate: string,
    limit?: number
  ): Promise<BacktestStockSnapshot[]> {
    const result = await query(
      `SELECT
         fs.symbol,
         msr.company_name as name,
         msr.sector,
         fs.quality_factor as quality,
         fs.growth_factor as growth,
         fs.value_factor as valuation,
         fs.momentum_factor as momentum,
         fs.risk_factor as risk,
         fs.sector_strength_factor as "sectorStrength",
         fs.factor_score as "factorScore",
         COALESCE(fs.quality_factor * 0.25 + fs.growth_factor * 0.20
           + fs.value_factor * 0.15 + fs.momentum_factor * 0.15
           + fs.risk_factor * 0.10 + fs.sector_strength_factor * 0.15, 50) as "healthScore"
       FROM factor_snapshots fs
       LEFT JOIN master_security_registry msr ON fs.symbol = msr.symbol
       WHERE fs.trade_date = $1
       ORDER BY fs.factor_score DESC
       ${limit ? 'LIMIT $2' : ''}`,
      limit ? [snapshotDate, limit] : [snapshotDate]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      name: row.name || row.symbol,
      sector: row.sector || null,
      healthScore: Math.round(parseFloat(row.healthScore) || 50),
      classification: this.classify(parseFloat(row.healthScore) || 50),
      confidence: 'High',
      growth: parseFloat(row.growth) || 50,
      quality: parseFloat(row.quality) || 50,
      stability: 50,
      valuation: parseFloat(row.valuation) || 50,
      momentum: parseFloat(row.momentum) || 50,
      risk: parseFloat(row.risk) || 50,
      factorScore: parseFloat(row.factorScore) || 50,
      forwardReturn: 0,
    }));
  }

  private classify(score: number): string {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Healthy';
    if (score >= 50) return 'Stable';
    if (score >= 35) return 'Weakening';
    return 'At Risk';
  }

  /**
   * Fetch the actual forward return for a stock from price data.
   */
  private async fetchForwardReturn(
    symbol: string,
    fromDate: string,
    horizonDays: number
  ): Promise<number> {
    const result = await query(
      `SELECT
         (SELECT adjusted_close FROM daily_prices
          WHERE symbol = $1 AND trade_date <= $2::date + $3::int
          ORDER BY trade_date DESC LIMIT 1) as end_price,
         (SELECT adjusted_close FROM daily_prices
          WHERE symbol = $1 AND trade_date <= $2::date
          ORDER BY trade_date DESC LIMIT 1) as start_price`,
      [symbol, fromDate, horizonDays]
    );

    if (result.rows.length === 0) return 0;
    const row = result.rows[0];
    if (!row.start_price || !row.end_price || parseFloat(row.start_price) <= 0) return 0;
    return (parseFloat(row.end_price) - parseFloat(row.start_price)) / parseFloat(row.start_price);
  }

  private selectPortfolio(
    stocks: BacktestStockSnapshot[],
    strategy: StrategyType
  ): BacktestStockSnapshot[] {
    switch (strategy) {
      case 'TOP_10':
        return stocks.slice(0, 10);
      case 'TOP_20':
        return stocks.slice(0, 20);
      case 'TOP_50':
        return stocks.slice(0, 50);
      case 'SECTOR_BALANCED_TOP_20': {
        // Pick top 2 from each sector until we have 20
        const sectorBuckets: Map<string, BacktestStockSnapshot[]> = new Map();
        for (const stock of stocks) {
          const sector = stock.sector || 'Unknown';
          if (!sectorBuckets.has(sector)) sectorBuckets.set(sector, []);
          const bucket = sectorBuckets.get(sector)!;
          if (bucket.length < 2) bucket.push(stock);
        }
        const balanced: BacktestStockSnapshot[] = [];
        for (const bucket of sectorBuckets.values()) {
          balanced.push(...bucket);
        }
        // If we don't have 20, fill from remaining
        if (balanced.length < 20) {
          for (const stock of stocks) {
            if (balanced.length >= 20) break;
            if (!balanced.find(s => s.symbol === stock.symbol)) {
              balanced.push(stock);
            }
          }
        }
        return balanced.slice(0, 20);
      }
      case 'CONFIDENCE_WEIGHTED': {
        const selected = stocks.slice(0, 30);
        return selected;
      }
    }
  }

  private getRebalanceIntervalDays(frequency: RebalanceFrequency): number {
    switch (frequency) {
      case 'WEEKLY': return 7;
      case 'MONTHLY': return 21;
      case 'QUARTERLY': return 63;
    }
  }

  private computeMetrics(returns: number[], totalReturn: number, days: number): BenchmarkMetrics {
    const annVol = annualizedVolatility(returns);
    const annRet = annualizedReturn(totalReturn, days);
    const monthlyReturns: number[] = [];
    for (let i = 0; i < returns.length; i += 21) {
      const chunk = returns.slice(i, i + 21);
      if (chunk.length > 0) {
        monthlyReturns.push(chunk.reduce((a, b) => a + b, 0));
      }
    }
    const positiveMonths = monthlyReturns.filter(r => r > 0).length;

    const curve = [1];
    for (const r of returns) curve.push(curve[curve.length - 1] * (1 + r));

    return {
      cagr: annRet,
      sharpe: sharpeRatio(annRet, annVol),
      sortino: sortinoRatio(returns),
      maxDrawdown: maxDrawdown(curve),
      volatility: annVol,
      totalReturn,
      positiveMonths,
      totalMonths: monthlyReturns.length,
      winRate: monthlyReturns.length > 0 ? positiveMonths / monthlyReturns.length : 0,
    };
  }

  async simulateStrategy(
    strategy: StrategyType,
    rebalance: RebalanceFrequency,
    startDate: string,
    endDate: string
  ): Promise<StrategyResult> {
    const rebalanceInterval = this.getRebalanceIntervalDays(rebalance);

    // Get available snapshot dates
    const snapshotResult = await query(
      `SELECT DISTINCT trade_date FROM factor_snapshots
       WHERE trade_date BETWEEN $1 AND $2
       ORDER BY trade_date`,
      [startDate, endDate]
    );

    const snapshotDates = snapshotResult.rows.map(r =>
      r.trade_date.toISOString().split('T')[0]
    );

    if (snapshotDates.length === 0) {
      return {
        strategy,
        rebalance,
        metrics: { cagr: 0, sharpe: 0, sortino: 0, maxDrawdown: 0, volatility: 0, totalReturn: 0, positiveMonths: 0, totalMonths: 0, winRate: 0 },
        alpha: 0, trackingError: 0, informationRatio: 0, turnover: 0, hitRate: 0,
      };
    }

    // Simulate: at each rebalance date, pick portfolio, measure forward return until next rebalance
    const portfolioReturns: number[] = [];
    let previousPortfolio: string[] = [];
    let turnoverSum = 0;
    let rebalanceCount = 0;

    for (let i = 0; i < snapshotDates.length; i++) {
      const date = snapshotDates[i];
      const horizonDays = Math.min(rebalanceInterval, 
        this.daysBetween(date, snapshotDates[Math.min(i + 1, snapshotDates.length - 1)]));

      const rankedStocks = await this.fetchRankedStocks(date);
      const portfolio = this.selectPortfolio(rankedStocks, strategy);
      const currentSymbols = portfolio.map(s => s.symbol);

      // Calculate turnover
      if (previousPortfolio.length > 0) {
        const newStocks = currentSymbols.filter(s => !previousPortfolio.includes(s));
        const removedStocks = previousPortfolio.filter(s => !currentSymbols.includes(s));
        turnoverSum += (newStocks.length + removedStocks.length) / previousPortfolio.length;
        rebalanceCount++;
      }
      previousPortfolio = currentSymbols;

      // Calculate equal-weight portfolio return
      const stockReturns = await Promise.all(
        currentSymbols.map(s => this.fetchForwardReturn(s, date, horizonDays))
      );
      const validReturns = stockReturns.filter(r => !isNaN(r) && isFinite(r));
      if (validReturns.length > 0) {
        const avgReturn = validReturns.reduce((a, b) => a + b, 0) / validReturns.length;
        portfolioReturns.push(avgReturn);
      }
    }

    const totalReturn = portfolioReturns.reduce((a, b) => a + b, 0);
    const metrics = this.computeMetrics(portfolioReturns, totalReturn, snapshotDates.length);

    // Alpha approximation vs equal weight
    const alpha = metrics.cagr - 0.065; // vs risk-free rate as baseline

    return {
      strategy,
      rebalance,
      metrics,
      alpha,
      trackingError: metrics.volatility * 0.3, // Approximate
      informationRatio: alpha / (metrics.volatility * 0.3 + 0.0001),
      turnover: rebalanceCount > 0 ? turnoverSum / rebalanceCount : 0,
      hitRate: metrics.winRate,
    };
  }

  private daysBetween(date1: string, date2: string): number {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
  }

  async simulateAllStrategies(
    startDate: string,
    endDate: string
  ): Promise<StrategyResult[]> {
    const strategies: StrategyType[] = [
      'TOP_10', 'TOP_20', 'TOP_50', 'SECTOR_BALANCED_TOP_20', 'CONFIDENCE_WEIGHTED',
    ];
    const frequencies: RebalanceFrequency[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];

    const results: StrategyResult[] = [];
    for (const strategy of strategies) {
      for (const freq of frequencies) {
        const result = await this.simulateStrategy(strategy, freq, startDate, endDate);
        results.push(result);
      }
    }

    return results;
  }
}

export const portfolioSimulator = new PortfolioSimulator();
