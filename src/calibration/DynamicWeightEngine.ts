/**
 * DynamicWeightEngine — TRACK-34 Phase 4
 *
 * Adjusts engine composite weights based on current market regime.
 * Detects regime from the last 30 daily_prices rows for NIFTY 50
 * and returns regime-tuned weights that sum to 1.0.
 *
 * Regime weight heuristics:
 *   Bull:     momentum (0.30), growth (0.30), quality (0.20), value (0.10), risk (0.10)
 *   Bear:     quality (0.35), risk (0.25), value (0.25), momentum (0.075), growth (0.075)
 *   Sideways: balanced — all five at 0.20
 *   HighVol:  quality (0.35), risk (0.30), value (0.20), momentum (0.075), growth (0.075)
 *   LowVol:   momentum (0.30), growth (0.30), quality (0.20), value (0.10), risk (0.10)
 */

import pool from '../db/index';

/** Market regime classification based on recent NIFTY 50 behavior. */
export type MarketRegime = 'Bull' | 'Bear' | 'Sideways' | 'HighVol' | 'LowVol';

/** Dynamic engine weights summing to 1.0. */
export interface EngineWeights {
  growth_weight: number;
  value_weight: number;
  momentum_weight: number;
  quality_weight: number;
  risk_weight: number;
}

/** Predefined weight profiles for each market regime. */
const REGIME_WEIGHTS: Record<MarketRegime, EngineWeights> = {
  Bull: {
    growth_weight: 0.30,
    value_weight: 0.10,
    momentum_weight: 0.30,
    quality_weight: 0.20,
    risk_weight: 0.10,
  },
  Bear: {
    growth_weight: 0.075,
    value_weight: 0.25,
    momentum_weight: 0.075,
    quality_weight: 0.35,
    risk_weight: 0.25,
  },
  Sideways: {
    growth_weight: 0.20,
    value_weight: 0.20,
    momentum_weight: 0.20,
    quality_weight: 0.20,
    risk_weight: 0.20,
  },
  HighVol: {
    growth_weight: 0.075,
    value_weight: 0.20,
    momentum_weight: 0.075,
    quality_weight: 0.35,
    risk_weight: 0.30,
  },
  LowVol: {
    growth_weight: 0.30,
    value_weight: 0.10,
    momentum_weight: 0.30,
    quality_weight: 0.20,
    risk_weight: 0.10,
  },
};

/** NIFTY 50 symbol identifier in the daily_prices table. */
const NIFTY50_SYMBOL = 'NIFTY 50';

export class DynamicWeightEngine {
  /**
   * Return regime-appropriate engine composite weights.
   * Weights always sum to 1.0.
   */
  getWeights(regime: MarketRegime): EngineWeights {
    return { ...REGIME_WEIGHTS[regime] };
  }

  /**
   * Detect the current market regime from the last 30 daily_prices rows
   * for NIFTY 50. Computes return and volatility to classify the regime.
   *
   * Detection logic:
   *   - Compute 20-day return (direction) and 30-day annualized volatility
   *   - Bull:  return > +3% and volatility < 20%
   *   - Bear:  return < -3%
   *   - HighVol: volatility > 25%
   *   - LowVol: volatility < 12%
   *   - Sideways: default when no clear signal
   */
  async detectRegime(): Promise<MarketRegime> {
    try {
      const result = await pool.query(
        `SELECT close, trade_date
         FROM daily_prices
         WHERE symbol = $1
         ORDER BY trade_date DESC
         LIMIT 30`,
        [NIFTY50_SYMBOL]
      );

      const rows = result.rows;
      if (rows.length < 20) {
        // Insufficient data — default to Sideways
        return 'Sideways';
      }

      // Rows are DESC by trade_date, so index 0 is most recent
      const closes: number[] = rows.map(r => parseFloat(r.close)).reverse(); // oldest → newest

      const n = closes.length;
      const latestClose = closes[n - 1];
      const startClose = closes[0];

      // 20-day return (or max available)
      const returnPoints = Math.min(20, n);
      const returnStart = closes[n - returnPoints];
      const periodReturn = ((latestClose - returnStart) / returnStart) * 100;

      // 30-day annualized volatility using daily log returns
      const logReturns: number[] = [];
      for (let i = 1; i < n; i++) {
        if (closes[i - 1] > 0) {
          logReturns.push(Math.log(closes[i] / closes[i - 1]));
        }
      }

      if (logReturns.length < 5) {
        return 'Sideways';
      }

      const meanLogReturn = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
      const variance = logReturns.reduce((sum, r) => sum + (r - meanLogReturn) ** 2, 0) / (logReturns.length - 1);
      const dailyVol = Math.sqrt(variance);
      const annualVol = dailyVol * Math.sqrt(252) * 100; // percentage

      // Classify regime
      if (annualVol > 25) {
        return 'HighVol';
      }

      if (annualVol < 12 && periodReturn > 0) {
        return 'LowVol';
      }

      if (periodReturn > 3) {
        return 'Bull';
      }

      if (periodReturn < -3) {
        return 'Bear';
      }

      if (annualVol < 12) {
        return 'LowVol';
      }

      return 'Sideways';
    } catch {
      // On any query error, default to Sideways
      return 'Sideways';
    }
  }
}

export const dynamicWeightEngine = new DynamicWeightEngine();
export default DynamicWeightEngine;