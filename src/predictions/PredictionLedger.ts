/**
 * PredictionLedger — TRACK-32 Phase 11
 *
 * Query-layer over the PredictionRegistry. Provides filtered access
 * to prediction records and aggregate performance summaries.
 *
 * All writes remain in PredictionRegistry; the Ledger is read-only.
 */

import pool from '../db/index';
import { predictionRegistry } from './PredictionRegistry';
import type { PredictionRecord } from './types';

export interface PredictionQuery {
  startDate?: string;
  endDate?: string;
  symbol?: string;
  horizon?: number;
  status?: string;
}

export interface ValidatedQuery {
  startDate?: string;
  endDate?: string;
  horizon?: number;
}

export interface PerformanceSummary {
  total_predictions: number;
  validated_count: number;
  pending_count: number;
  mean_alpha_30d: number;
  hit_rate_30d: number;
  best_symbol: string | null;
  worst_symbol: string | null;
}

export class PredictionLedger {
  private readonly registry = predictionRegistry;

  /**
   * Get predictions with flexible filtering.
   * Wraps predictionRegistry.getPredictionsByDateRange and
   * applies additional symbol filtering in-memory.
   */
  async getPredictions(params: PredictionQuery): Promise<PredictionRecord[]> {
    const startDate = params.startDate || '2000-01-01';
    const endDate = params.endDate || '2100-12-31';

    let predictions = await this.registry.getPredictionsByDateRange(
      startDate,
      endDate,
      {
        horizon: params.horizon,
        status: params.status as any,
      },
    );

    // Apply symbol filter if specified
    if (params.symbol) {
      const symbolUpper = params.symbol.toUpperCase();
      predictions = predictions.filter(p => p.symbol.toUpperCase() === symbolUpper);
    }

    return predictions;
  }

  /**
   * Get validated predictions with optional date range and horizon filtering.
   * Wraps predictionRegistry.getValidatedPredictions.
   */
  async getValidatedPredictions(params: ValidatedQuery): Promise<PredictionRecord[]> {
    return this.registry.getValidatedPredictions({
      minDate: params.startDate,
      maxDate: params.endDate,
      horizon: params.horizon,
    });
  }

  /**
   * Aggregate performance statistics from prediction_registry.
   *
   * Computes:
   *  - total_predictions: total row count
   *  - validated_count / pending_count
   *  - mean_alpha_30d: average alpha over last 30 days of validated predictions
   *  - hit_rate_30d: fraction with alpha > 0 over last 30 days
   *  - best_symbol / worst_symbol: symbols with best/worst mean alpha (all-time)
   */
  async getPerformanceSummary(): Promise<PerformanceSummary> {
    // Total counts and validated counts
    const countResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_predictions,
         COUNT(*) FILTER (WHERE validation_status = 'validated')::int AS validated_count,
         COUNT(*) FILTER (WHERE validation_status = 'pending')::int AS pending_count
       FROM prediction_registry`,
    );

    const { total_predictions, validated_count, pending_count } = countResult.rows[0];

    // Mean alpha and hit rate over last 30 days of validated predictions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const alphaResult = await pool.query(
      `SELECT
         AVG(alpha) AS mean_alpha,
         COUNT(*) FILTER (WHERE alpha > 0)::float / NULLIF(COUNT(*), 0) AS hit_rate
       FROM prediction_registry
       WHERE validation_status = 'validated'
         AND validated_at >= $1
         AND alpha IS NOT NULL`,
      [thirtyDaysAgoStr],
    );

    const mean_alpha_30d = alphaResult.rows[0]?.mean_alpha !== null
      ? Math.round(Number(alphaResult.rows[0].mean_alpha) * 1e4) / 1e4
      : 0;
    const hit_rate_30d = alphaResult.rows[0]?.hit_rate !== null
      ? Math.round(Number(alphaResult.rows[0].hit_rate) * 1e4) / 1e4
      : 0;

    // Best and worst symbols by mean alpha (all-time, minimum 3 validated)
    const symbolResult = await pool.query(
      `WITH symbol_stats AS (
        SELECT
          symbol,
          AVG(alpha) AS mean_alpha,
          COUNT(*) AS n
        FROM prediction_registry
        WHERE validation_status = 'validated'
          AND alpha IS NOT NULL
        GROUP BY symbol
        HAVING COUNT(*) >= 3
      )
      SELECT
        (SELECT symbol FROM symbol_stats ORDER BY mean_alpha DESC LIMIT 1) AS best_symbol,
        (SELECT symbol FROM symbol_stats ORDER BY mean_alpha ASC  LIMIT 1) AS worst_symbol`,
    );

    const best_symbol: string | null = symbolResult.rows[0]?.best_symbol ?? null;
    const worst_symbol: string | null = symbolResult.rows[0]?.worst_symbol ?? null;

    return {
      total_predictions,
      validated_count,
      pending_count,
      mean_alpha_30d,
      hit_rate_30d,
      best_symbol,
      worst_symbol,
    };
  }
}

export const predictionLedger = new PredictionLedger();
export default PredictionLedger;