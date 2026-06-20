/**
 * OutcomeValidationEngine — TRACK-32 Phase 3
 *
 * Validates predictions once their horizon has passed.
 * Fetches current prices and benchmark levels, computes returns and alpha,
 * and marks predictions as validated in the registry.
 *
 * This is where the "forward evidence" pipeline proves whether predictions
 * actually had predictive power.
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import type { PredictionRecord, ValidationResult } from './types';

export class OutcomeValidationEngine {
  /**
   * Validate all pending predictions for a given horizon that are past their
   * prediction_horizon + prediction_date cutoff.
   *
   * For each pending prediction:
   *   1. Get the latest close price for the symbol from daily_prices
   *   2. Get the current NIFTY 50 benchmark level
   *   3. Calculate future_return, benchmark_return, alpha
   *   4. Call predictionRegistry.validatePrediction to persist the outcome
   *
   * @param horizonDays - The prediction horizon being validated (7, 30, 90, 180, 365)
   * @param referenceDate - ISO date string (e.g. "2025-01-15") — "today" for validation purposes
   * @returns Array of ValidationResult for each validated prediction
   */
  async validateAtHorizon(
    horizonDays: number,
    referenceDate: string,
  ): Promise<ValidationResult[]> {
    // 1. Get all pending predictions whose horizon has passed
    const pendingPredictions =
      await predictionRegistry.getPendingPredictionsPastHorizon(horizonDays, referenceDate);

    if (pendingPredictions.length === 0) {
      return [];
    }

    // 2. Get distinct symbols to batch-fetch current prices
    const symbols = [...new Set(pendingPredictions.map((p) => p.symbol))];

    // 3. Fetch latest close prices for all symbols up to referenceDate
    const currentPrices = await this.fetchCurrentPrices(symbols, referenceDate);

    // 4. Fetch current benchmark level (NIFTY 50) closest to referenceDate
    const currentBenchmark = await this.fetchCurrentBenchmark(referenceDate);

    // 5. For each pending prediction, compute returns and validate
    const results: ValidationResult[] = [];

    for (const prediction of pendingPredictions) {
      const currentPrice = currentPrices.get(prediction.symbol);

      // Skip if we don't have current price data
      if (currentPrice === undefined || currentPrice === null) {
        continue;
      }

      // Calculate future_return as percentage change from prediction price
      const priceAtPrediction = prediction.price_at_prediction;
      if (!priceAtPrediction || priceAtPrediction === 0) {
        continue; // Cannot calculate return without real price
      }

      const futureReturn =
        ((currentPrice - priceAtPrediction) / priceAtPrediction) * 100;

      // Calculate benchmark return
      const benchmarkAtPrediction = prediction.benchmark_level;
      let benchmarkReturn: number | null = null;

      if (currentBenchmark !== null && benchmarkAtPrediction && benchmarkAtPrediction !== 0) {
        benchmarkReturn =
          ((currentBenchmark - benchmarkAtPrediction) / benchmarkAtPrediction) * 100;
      }

      // Alpha = excess return over benchmark
      const alpha =
        benchmarkReturn !== null ? futureReturn - benchmarkReturn : futureReturn;

      // Persist the validation outcome
      const validatedRecord = await predictionRegistry.validatePrediction(
        prediction.id,
        futureReturn,
        benchmarkReturn ?? 0,
        alpha,
      );

      if (validatedRecord) {
        results.push({
          prediction_id: prediction.id,
          symbol: prediction.symbol,
          horizon_days: horizonDays,
          predicted_at: prediction.prediction_date,
          validated_at: new Date().toISOString(),
          ranking_score: prediction.ranking_score,
          future_return: futureReturn,
          benchmark_return: benchmarkReturn ?? 0,
          alpha,
          hit: alpha > 0,
        });
      }
    }

    return results;
  }

  /**
   * Run validation across all standard horizons.
   *
   * @param referenceDate - ISO date string for "today"
   * @returns Map of horizon days → ValidationResult array
   */
  async runAllHorizons(
    referenceDate: string,
  ): Promise<Record<number, ValidationResult[]>> {
    const horizons = [7, 30, 90, 180, 365];
    const resultsByHorizon: Record<number, ValidationResult[]> = {};

    for (const horizon of horizons) {
      resultsByHorizon[horizon] = await this.validateAtHorizon(horizon, referenceDate);
    }

    return resultsByHorizon;
  }

  /**
   * Calculate the hit rate — fraction of validation results where alpha > 0.
   *
   * A "hit" means the prediction outperformed the benchmark (positive alpha).
   *
   * @param results - Array of ValidationResult from validateAtHorizon
   * @returns Hit rate as a fraction between 0 and 1
   */
  calculateHitRate(results: ValidationResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    const hits = results.filter((r) => r.hit === true).length;
    return hits / results.length;
  }

  // ── Private helpers ──────────────────────────────────────

  /**
   * Fetch the latest close price for each symbol on or before referenceDate.
   * Uses DISTINCT ON to get the most recent row per symbol.
   *
   * @returns Map of symbol → latest close price
   */
  private async fetchCurrentPrices(
    symbols: string[],
    referenceDate: string,
  ): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    if (symbols.length === 0) {
      return priceMap;
    }

    // Build parameterized query for the symbol list
    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(', ');
    // referenceDate is the last param
    const refParamIdx = symbols.length + 1;

    const result = await pool.query(
      `SELECT DISTINCT ON (dp.symbol)
              dp.symbol,
              dp.close
       FROM daily_prices dp
       WHERE dp.symbol IN (${placeholders})
         AND dp.trade_date <= $${refParamIdx}
       ORDER BY dp.symbol, dp.trade_date DESC`,
      [...symbols, referenceDate],
    );

    for (const row of result.rows) {
      priceMap.set(row.symbol, row.close ? Number(row.close) : 0);
    }

    return priceMap;
  }

  /**
   * Fetch the current NIFTY 50 benchmark level.
   * Tries benchmark_observations first, then falls back to daily_prices
   * for the ^NSEI or NIFTY 50 symbol.
   *
   * @returns Current benchmark level or null if unavailable
   */
  private async fetchCurrentBenchmark(
    referenceDate: string,
  ): Promise<number | null> {
    // Try benchmark_observations first
    const benchResult = await pool.query(
      `SELECT nifty50, observed_date
       FROM benchmark_observations
       WHERE observed_date <= $1
       ORDER BY observed_date DESC
       LIMIT 1`,
      [referenceDate],
    );

    if (benchResult.rows.length > 0 && benchResult.rows[0].nifty50 !== null) {
      return Number(benchResult.rows[0].nifty50);
    }

    // Fallback: Try daily_prices for a NIFTY 50 proxy symbol
    // Common tickers: ^NSEI, NIFTY50, NIFTY 50
    const fallbackResult = await pool.query(
      `SELECT dp.close
       FROM daily_prices dp
       WHERE dp.symbol IN ('^NSEI', 'NIFTY50', 'NIFTY 50', 'NSEI')
         AND dp.trade_date <= $1
       ORDER BY dp.trade_date DESC
       LIMIT 1`,
      [referenceDate],
    );

    if (fallbackResult.rows.length > 0 && fallbackResult.rows[0].close !== null) {
      return Number(fallbackResult.rows[0].close);
    }

    return null;
  }
}

export const outcomeValidationEngine = new OutcomeValidationEngine();
export default OutcomeValidationEngine;