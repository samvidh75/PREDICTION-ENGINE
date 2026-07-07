/**
 * HistoricalRankingRebuilder — TRACK-33 Phase 2
 *
 * Reconstructs historical monthly rankings from factor_snapshots + daily_prices.
 * Point-in-time only — no future information leakage.
 * Generates prediction_registry records for July 2021 → current.
 *
 * Approach:
 *   - For each month-end date from July 2021 to present
 *   - Get the latest factor_snapshot for each symbol as of that date
 *   - Get the latest close price for each symbol from daily_prices
 *   - Compute classification, confidence_level from scores
 *   - Insert INTO prediction_registry with prediction_horizon = 30/90/365
 *   - created_by = 'HistoricalRankingRebuilder'
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import type { CreatePredictionInput, Classification, ConfidenceLevel } from './types';

export interface RebuildResult {
  datesProcessed: number;
  predictionsCreated: number;
  dateRange: { from: string; to: string };
  symbolsPerDate: number[];
}

export class HistoricalRankingRebuilder {
  /**
   * Rebuild historical rankings from July 2021 to the given end date.
   */
  async rebuild(endDate?: string): Promise<RebuildResult> {
    const referenceDate = endDate || new Date().toISOString().split('T')[0];
    const startDate = '2021-07-01';

    // Generate month-end dates
    const monthEndDates = this.generateMonthEndDates(startDate, referenceDate);
    console.info(`[HistoricalRankingRebuilder] Processing ${monthEndDates.length} month-end dates from ${startDate} to ${referenceDate}`);

    let totalPredictions = 0;
    const symbolsPerDate: number[] = [];
    const horizons = [30, 90, 365]; // Core horizons for historical data

    for (const dateStr of monthEndDates) {
      const rankings = await this.fetchPointInTimeRankings(dateStr);
      symbolsPerDate.push(rankings.length);

      if (rankings.length === 0) {
        console.info(`  [${dateStr}] No ranking data available, skipping`);
        continue;
      }

      // Build prediction inputs for each ranking across all horizons
      const inputs: CreatePredictionInput[] = [];
      for (const r of rankings) {
        for (const horizon of horizons) {
          inputs.push({
            symbol: r.symbol,
            predictionDate: dateStr,
            rankingScore: r.factor_score,
            classification: classifyScore(r.factor_score),
            confidenceScore: r.confidence_score,
            confidenceLevel: classifyConfidence(r.confidence_score),
            qualityScore: r.quality_factor,
            growthScore: r.growth_factor,
            valueScore: r.value_factor,
            momentumScore: r.momentum_factor,
            riskScore: r.risk_factor,
            sectorScore: r.sector_strength_factor,
            priceAtPrediction: r.close_price,
            benchmarkLevel: r.benchmark_level ?? 0,
            predictionHorizon: horizon,
            createdBy: 'HistoricalRankingRebuilder',
          });
        }
      }

      // Batch insert into prediction_registry via registry
      await predictionRegistry.createPredictionsBatch(inputs);
      totalPredictions += inputs.length;
      console.info(`  [${dateStr}] Inserted ${inputs.length} predictions from ${rankings.length} symbols`);
    }

    return {
      datesProcessed: monthEndDates.length,
      predictionsCreated: totalPredictions,
      dateRange: { from: startDate, to: referenceDate },
      symbolsPerDate,
    };
  }

  /**
   * Generate last-trading-day-of-month dates between start and end.
   */
  private generateMonthEndDates(start: string, end: string): string[] {
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);

    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      // Last day of current month
      const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0);
      if (lastDay >= startDate && lastDay <= endDate) {
        dates.push(lastDay.toISOString().split('T')[0]);
      }
      current.setMonth(current.getMonth() + 1);
    }
    return dates;
  }

  /**
   * Point-in-time: fetch latest factor_snapshot + price for each symbol as of `asOfDate`.
   * Only data with trade_date <= asOfDate is used — no look-ahead.
   */
  private async fetchPointInTimeRankings(asOfDate: string): Promise<RankingRow[]> {
    const result = await pool.query(
      `WITH LatestSnapshots AS (
        SELECT DISTINCT ON (symbol)
          symbol, trade_date,
          quality_factor, growth_factor, value_factor,
          momentum_factor, risk_factor, sector_strength_factor,
          factor_score, confidence_score, confidence_level
        FROM factor_snapshots
        WHERE trade_date <= $1
        ORDER BY symbol, trade_date DESC
      ),
      LatestPrices AS (
        SELECT DISTINCT ON (symbol)
          symbol, close
        FROM daily_prices
        WHERE trade_date <= $1
        ORDER BY symbol, trade_date DESC
      ),
      Benchmarks AS (
        SELECT close AS pse-index50 FROM daily_prices
        WHERE symbol IN ('NIFTY 50', 'NIFTY50', '^PSEI', 'PSEI')
          AND trade_date <= $1
        ORDER BY trade_date DESC
        LIMIT 1
      )
      SELECT
        ls.symbol, ls.trade_date,
        ls.quality_factor, ls.growth_factor, ls.value_factor,
        ls.momentum_factor, ls.risk_factor, ls.sector_strength_factor,
        ls.factor_score,
        COALESCE(ls.confidence_score, 50) as confidence_score,
        COALESCE(ls.confidence_level, 'Medium') as confidence_level,
        COALESCE(lp.close, 0) as close_price,
        (SELECT pse-index50 FROM Benchmarks) as benchmark_level
      FROM LatestSnapshots ls
      LEFT JOIN LatestPrices lp ON ls.symbol = lp.symbol
      WHERE ls.factor_score IS NOT NULL
      ORDER BY ls.factor_score DESC`,
      [asOfDate]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      trade_date: row.trade_date,
      quality_factor: Number(row.quality_factor ?? 0),
      growth_factor: Number(row.growth_factor ?? 0),
      value_factor: Number(row.value_factor ?? 0),
      momentum_factor: Number(row.momentum_factor ?? 0),
      risk_factor: Number(row.risk_factor ?? 0),
      sector_strength_factor: Number(row.sector_strength_factor ?? 0),
      factor_score: Number(row.factor_score ?? 0),
      confidence_score: Number(row.confidence_score ?? 50),
      confidence_level: row.confidence_level ?? 'Medium',
      close_price: Number(row.close_price ?? 0),
      benchmark_level: row.benchmark_level ? Number(row.benchmark_level) : null,
    }));
  }

}

interface RankingRow {
  symbol: string;
  trade_date: string;
  quality_factor: number;
  growth_factor: number;
  value_factor: number;
  momentum_factor: number;
  risk_factor: number;
  sector_strength_factor: number;
  factor_score: number;
  confidence_score: number;
  confidence_level: string;
  close_price: number;
  benchmark_level: number | null;
}

function classifyScore(score: number): Classification {
  if (score >= 85) return 'Exceptional';
  if (score >= 70) return 'Excellent';
  if (score >= 55) return 'Good';
  if (score >= 40) return 'Fair';
  if (score >= 25) return 'Weak';
  return 'Critical';
}

function classifyConfidence(score: number): ConfidenceLevel {
  if (score >= 80) return 'Very High';
  if (score >= 65) return 'High';
  if (score >= 45) return 'Medium';
  return 'Low';
}

export const historicalRankingRebuilder = new HistoricalRankingRebuilder();
export default HistoricalRankingRebuilder;
