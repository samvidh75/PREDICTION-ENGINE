/**
 * DynamicWeightEngine — TRACK-34 Phase 4
 *
 * Adjusts engine composite weights based on current market regime.
 * Detects regime from the last 30 daily_prices rows for KSE-100 index
 * and returns regime-tuned weights that sum to 1.0.
 */

import pool from '../db/index';

export type MarketRegime = 'Bull' | 'Bear' | 'Sideways' | 'HighVol' | 'LowVol';

export interface EngineWeights {
  growth_weight: number;
  value_weight: number;
  momentum_weight: number;
  quality_weight: number;
  risk_weight: number;
}

const REGIME_WEIGHTS: Record<MarketRegime, EngineWeights> = {
  Bull: { growth_weight: 0.30, value_weight: 0.10, momentum_weight: 0.30, quality_weight: 0.20, risk_weight: 0.10 },
  Bear: { growth_weight: 0.075, value_weight: 0.25, momentum_weight: 0.075, quality_weight: 0.35, risk_weight: 0.25 },
  Sideways: { growth_weight: 0.20, value_weight: 0.20, momentum_weight: 0.20, quality_weight: 0.20, risk_weight: 0.20 },
  HighVol: { growth_weight: 0.075, value_weight: 0.20, momentum_weight: 0.075, quality_weight: 0.35, risk_weight: 0.30 },
  LowVol: { growth_weight: 0.30, value_weight: 0.10, momentum_weight: 0.30, quality_weight: 0.20, risk_weight: 0.10 },
};

export class DynamicWeightEngine {
  private readonly PSEI_SYMBOL = 'PSEI';

  getWeights(regime: MarketRegime): EngineWeights {
    return { ...REGIME_WEIGHTS[regime] };
  }

  async detectRegime(): Promise<MarketRegime> {
    try {
      const result = await pool.query(
        `SELECT close FROM daily_prices WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 30`,
        [this.PSEI_SYMBOL]
      );

      if (result.rows.length < 10) return 'Sideways';

      const closes: number[] = result.rows.map((r: any) => Number(r.close));
      const returns = closes.slice(0, -1).map((c, i) => (c - closes[i + 1]) / closes[i + 1]);

      const totalReturn = returns.reduce((a, b) => a * (1 + b), 1) - 1;
      const volatility = Math.sqrt(returns.reduce((s, r) => s + (r - totalReturn / returns.length) ** 2, 0) / returns.length) * Math.sqrt(252);

      if (totalReturn > 0.05 && volatility < 0.15) return 'Bull';
      if (totalReturn < -0.05 && volatility > 0.15) return 'Bear';
      if (volatility > 0.25) return 'HighVol';
      if (volatility < 0.10) return 'LowVol';
      return 'Sideways';
    } catch {
      return 'Sideways';
    }
  }
}

export const dynamicWeightEngine = new DynamicWeightEngine();
export default DynamicWeightEngine;
