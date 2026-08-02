/**
 * DailyPredictionCapture — TRACK-32 Phase 2
 *
 * Captures daily prediction snapshots from every ranking run.
 * Freezes top/bottom cohorts with all engine scores, confidence, and prices.
 * No retroactive adjustments — snapshots are immutable once captured.
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import type {
  PredictionRecord,
  PredictionSlice,
  CreatePredictionInput,
} from './types';

export interface RankingRow {
  symbol: string;
  quality_factor: number;
  value_factor: number;
  growth_factor: number;
  momentum_factor: number;
  risk_factor: number;
  sector_strength_factor: number;
  factor_score: number;
  confidence_score: number;
  confidence_level: string;
  classification: string;
  close_price: number;
}

export class DailyPredictionCapture {
  private readonly registry = predictionRegistry;

  /**
   * Capture a daily snapshot from the latest ranking data.
   * Reads factor_snapshots joined with daily_prices to get all score + price data.
   * Stores predictions at multiple horizons (7, 30, 90, 180, 365 days).
   */
  async captureSnapshot(referenceDate: string, benchmarkLevel: number): Promise<PredictionSlice> {
    // Get the latest ranking data for all symbols
    const rankings = await this.fetchLatestRankings(referenceDate);

    if (rankings.length === 0) {
      throw new Error(`No ranking data available for date: ${referenceDate}`);
    }

    // Sort by ranking score descending
    const sorted = [...rankings].sort((a, b) => b.factor_score - a.factor_score);

    const nSymbols = sorted.length;
    const top10 = sorted.slice(0, 10);
    const top25 = sorted.slice(0, 25);
    const top50 = sorted.slice(0, 50);
    const bottom10 = sorted.slice(-10).reverse();
    const bottom25 = sorted.slice(-25).reverse();

    // Store predictions at all horizons for top 50 and bottom 25
    const horizons = [7, 30, 90, 180, 365];
    const allInputs: CreatePredictionInput[] = [];

    for (const row of [...top50, ...bottom25]) {
      for (const horizon of horizons) {
        allInputs.push(this.rowToPredictionInput(row, referenceDate, benchmarkLevel, horizon));
      }
    }

    // Batch insert all predictions
    await this.registry.createPredictionsBatch(allInputs);

    // Build and store the snapshot
    const snapshot: PredictionSlice = {
      date: referenceDate,
      top10: top10.map(r => this.rowToRecord(r, referenceDate, benchmarkLevel)),
      top25: top25.map(r => this.rowToRecord(r, referenceDate, benchmarkLevel)),
      top50: top50.map(r => this.rowToRecord(r, referenceDate, benchmarkLevel)),
      bottom10: bottom10.map(r => this.rowToRecord(r, referenceDate, benchmarkLevel)),
      bottom25: bottom25.map(r => this.rowToRecord(r, referenceDate, benchmarkLevel)),
      benchmark_level: benchmarkLevel,
      n_symbols_ranked: nSymbols,
    };

    await this.registry.storeDailySnapshot(snapshot);
    return snapshot;
  }

  /**
   * Fetch the latest factor_snapshots joined with daily_prices for a given date.
   */
  private async fetchLatestRankings(referenceDate: string): Promise<RankingRow[]> {
    const result = await pool.query(
      `WITH RankedFactors AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
        FROM factor_snapshots
        WHERE trade_date <= $1
      ),
      RankedPrices AS (
        SELECT *, ROW_NUMBER() OVER(PARTITION BY symbol ORDER BY trade_date DESC) as rn
        FROM daily_prices
        WHERE trade_date <= $1
      )
      SELECT
        f.symbol,
        f.quality_factor,
        f.value_factor,
        f.growth_factor,
        f.momentum_factor,
        f.risk_factor,
        f.sector_strength_factor,
        f.factor_score,
        COALESCE(fv.confidence_score, 50) as confidence_score,
        COALESCE(fv.confidence_level, 'Medium') as confidence_level,
        CASE
          WHEN f.factor_score >= 85 THEN 'Exceptional'
          WHEN f.factor_score >= 70 THEN 'Excellent'
          WHEN f.factor_score >= 55 THEN 'Good'
          WHEN f.factor_score >= 40 THEN 'Fair'
          WHEN f.factor_score >= 25 THEN 'Weak'
          ELSE 'Critical'
        END as classification,
        COALESCE(p.close, 0) as close_price
      FROM RankedFactors f
      LEFT JOIN RankedPrices p ON f.symbol = p.symbol AND p.rn = 1
      LEFT JOIN LATERAL (
        SELECT
          confidence_score,
          CASE
            WHEN confidence_score >= 80 THEN 'Very High'
            WHEN confidence_score >= 65 THEN 'High'
            WHEN confidence_score >= 45 THEN 'Medium'
            ELSE 'Low'
          END as confidence_level
        FROM factor_snapshots
        WHERE symbol = f.symbol
        ORDER BY trade_date DESC
        LIMIT 1
      ) fv ON TRUE
      WHERE f.rn = 1
      ORDER BY f.factor_score DESC`,
      [referenceDate]
    );

    return result.rows.map(row => ({
      symbol: row.symbol,
      quality_factor: Number(row.quality_factor),
      value_factor: Number(row.value_factor),
      growth_factor: Number(row.growth_factor),
      momentum_factor: Number(row.momentum_factor),
      risk_factor: Number(row.risk_factor),
      sector_strength_factor: Number(row.sector_strength_factor),
      factor_score: Number(row.factor_score),
      confidence_score: Number(row.confidence_score),
      confidence_level: row.confidence_level,
      classification: row.classification,
      close_price: Number(row.close_price),
    }));
  }

  /**
   * Convert a ranking row to a CreatePredictionInput for the registry.
   */
  private rowToPredictionInput(
    row: RankingRow,
    date: string,
    benchmark: number,
    horizon: number,
  ): CreatePredictionInput {
    return {
      symbol: row.symbol,
      predictionDate: date,
      rankingScore: row.factor_score,
      classification: row.classification as any,
      confidenceScore: row.confidence_score,
      confidenceLevel: row.confidence_level as any,
      qualityScore: row.quality_factor,
      growthScore: row.growth_factor,
      valueScore: row.value_factor,
      momentumScore: row.momentum_factor,
      riskScore: row.risk_factor,
      sectorScore: row.sector_strength_factor,
      priceAtPrediction: row.close_price,
      benchmarkLevel: benchmark,
      predictionHorizon: horizon,
    };
  }

  /**
   * Convert a ranking row to a lightweight PredictionRecord (for snapshot storage).
   */
  private rowToRecord(
    row: RankingRow,
    date: string,
    benchmark: number,
  ): PredictionRecord {
    return {
      id: '',
      symbol: row.symbol,
      prediction_date: date,
      ranking_score: row.factor_score,
      classification: row.classification as any,
      confidence_score: row.confidence_score,
      confidence_level: row.confidence_level as any,
      quality_score: row.quality_factor,
      growth_score: row.growth_factor,
      value_score: row.value_factor,
      momentum_score: row.momentum_factor,
      risk_score: row.risk_factor,
      sector_score: row.sector_strength_factor,
      price_at_prediction: row.close_price,
      benchmark_level: benchmark,
      prediction_horizon: 30,
      validation_status: 'pending',
      validated_at: null,
      future_return: null,
      benchmark_return: null,
      alpha: null,
      created_at: '',
      created_by: 'DailyPredictionCapture',
    };
  }
}

export const dailyPredictionCapture = new DailyPredictionCapture();
export default DailyPredictionCapture;
