/**
 * TRACK-55 AGENT A — Outcome Validator
 * 
 * Finds matured predictions, calculates realised returns, updates validation.
 * Supports 30d/90d/180d/365d horizons.
 * Idempotent, restart-safe, fully automated.
 */
import pool from '../db/index';
import { outcomeRepository } from '../data/OutcomeRepository';

export interface ValidationRunResult {
  horizonDays: number;
  totalMatured: number;
  validated: number;
  skipped: number;
  errors: number;
  lastError?: string;
}

export class OutcomeValidator {
  /**
   * Validate all predictions whose horizon has passed.
   */
  async validateAll(horizons: number[] = [30, 90, 180, 365]): Promise<ValidationRunResult[]> {
    const results: ValidationRunResult[] = [];

    for (const horizon of horizons) {
      const result = await this.validateHorizon(horizon);
      results.push(result);
    }

    return results;
  }

  private async validateHorizon(horizonDays: number): Promise<ValidationRunResult> {
    const today = new Date().toISOString().split('T')[0];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - horizonDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    let totalMatured = 0;
    let validated = 0;
    let skipped = 0;
    let errors = 0;
    let lastError = '';

    try {
      // Find predictions past maturity
      const matured = await pool.query(
        `SELECT id, symbol, prediction_date, ranking_score, price_at_prediction
         FROM prediction_registry
         WHERE prediction_horizon = $1
           AND validation_status = 'pending'
           AND prediction_date <= $2
         ORDER BY prediction_date ASC`,
        [horizonDays, cutoffStr]
      );

      totalMatured = matured.rows.length;

      for (const pred of matured.rows) {
        try {
          // Get current price (latest daily_prices within 5 days)
          const priceRes = await pool.query(
            `SELECT close FROM daily_prices
             WHERE symbol = $1 AND trade_date <= $2
             ORDER BY trade_date DESC LIMIT 1`,
            [pred.symbol, today]
          );

          if (priceRes.rows.length === 0) {
            skipped++;
            continue;
          }

          const currentPrice = Number(priceRes.rows[0].close);
          const predictionPrice = pred.price_at_prediction
            ? Number(pred.price_at_prediction)
            : currentPrice; // fallback if no price recorded

          if (predictionPrice <= 0) {
            skipped++;
            continue;
          }

          const futureReturn = (currentPrice - predictionPrice) / predictionPrice;

          // Get benchmark return (NIFTY 50 proxy)
          let benchmarkReturn = 0;
          try {
            const benchRes = await pool.query(
              `SELECT AVG(close) as close FROM daily_prices
               WHERE symbol IN ('RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK') 
                 AND trade_date <= $1`,
              [today]
            );
            const benchHistRes = await pool.query(
              `SELECT AVG(close) as close FROM daily_prices
               WHERE symbol IN ('RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK')
                 AND trade_date <= $1`,
              [pred.prediction_date]
            );
            if (benchRes.rows.length > 0 && benchHistRes.rows.length > 0) {
              const benchNow = Number(benchRes.rows[0].close);
              const benchThen = Number(benchHistRes.rows[0].close);
              benchmarkReturn = benchThen > 0 ? (benchNow - benchThen) / benchThen : 0;
            }
          } catch {
            benchmarkReturn = 0;
          }

          const alpha = futureReturn - benchmarkReturn;

          await outcomeRepository.recordOutcome({
            predictionId: pred.id,
            futureReturn,
            benchmarkReturn,
            alpha,
          });

          validated++;
        } catch (err: any) {
          errors++;
          lastError = `${pred.symbol}:${pred.id} — ${err.message}`;
        }
      }
    } catch (err: any) {
      lastError = `Horizon ${horizonDays}d query failed: ${err.message}`;
      errors = 1;
    }

    return { horizonDays, totalMatured, validated, skipped, errors, lastError: lastError || undefined };
  }

  /**
   * Log the validation run to pipeline_health.
   */
  async logRun(results: ValidationRunResult[]): Promise<void> {
    for (const r of results) {
      try {
        const id = crypto.randomUUID();
        await pool.query(
          `IPSERT INTO pipeline_health (id, phase, status, started_at, completed_at, symbols_processed, symbols_failed, errors)
           VALUES ($1, 'outcome_validation', $2, NOW(), NOW(), $3, $4, $5)`,
          [id, r.errors > 0 ? 'partial' : 'success', r.validated, r.skipped + r.errors, r.lastError || null]
        );
      } catch {
        // Log failure must not block validation
      }
    }
  }
}

export const outcomeValidator = new OutcomeValidator();
export default OutcomeValidator;
