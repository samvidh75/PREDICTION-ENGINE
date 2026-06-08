import pool from '../db/index';

export interface Opportunity {
  symbol: string;
  category: 'Breakout' | 'Value_Opportunity' | 'Recovery_Candidate' | 'Confidence_Upgrade' | 'Momentum_Acceleration';
  score: number;
  factors: Record<string, number>;
  description: string;
}

export class OpportunityEngine {
  async detect(): Promise<Opportunity[]> {
    const opps: Opportunity[] = [];

    const { rows } = await pool.query(
      `WITH Ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_date DESC) AS rn
        FROM factor_snapshots
      )
      SELECT r1.*, r2.momentum_factor AS prev_momentum, r2.growth_factor AS prev_growth,
             r2.factor_score AS prev_score, r2.confidence_level AS prev_confidence,
             r2.value_factor AS prev_value
      FROM Ranked r1
      LEFT JOIN Ranked r2 ON r1.symbol = r2.symbol AND r2.rn = 2
      WHERE r1.rn = 1`
    );

    const peCache: Record<string, number> = {};
    for (const row of rows) {
      const sym = row.symbol;

      // New Breakouts: momentum > 70, prev < 60
      if (Number(row.momentum_factor || 0) > 70 && Number(row.prev_momentum || 0) < 60) {
        opps.push({
          symbol: sym, category: 'Breakout',
          score: Number(row.momentum_factor),
          factors: { momentum: Number(row.momentum_factor), factor_score: Number(row.factor_score) },
          description: `Momentum breakout detected — momentum factor rose from ${Number(row.prev_momentum).toFixed(0)} to ${Number(row.momentum_factor).toFixed(0)}. Price trend strengthening.`,
        });
      }

      // Value Opportunities: value_factor > 75, PE between 5-15
      if (Number(row.value_factor || 0) > 75) {
        if (peCache[sym] === undefined) {
          try {
            const pr = await pool.query(`SELECT pe_ratio FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`, [sym]);
            peCache[sym] = pr.rows[0]?.pe_ratio != null ? Number(pr.rows[0].pe_ratio) : 0;
          } catch { peCache[sym] = 0; }
        }
        const pe = peCache[sym];
        if (pe > 0 && pe <= 15) {
          opps.push({
            symbol: sym, category: 'Value_Opportunity',
            score: Number(row.value_factor),
            factors: { value: Number(row.value_factor), pe_ratio: pe, factor_score: Number(row.factor_score) },
            description: `Deep value candidate — value score ${Number(row.value_factor).toFixed(0)} with PE of ${(pe).toFixed(1)}.`,
          });
        }
      }

      // Recovery Candidates: growth_factor improved >15 pts
      if (Number(row.growth_factor || 0) - Number(row.prev_growth || 0) > 15) {
        opps.push({
          symbol: sym, category: 'Recovery_Candidate',
          score: Number(row.growth_factor),
          factors: { growth: Number(row.growth_factor), prev_growth: Number(row.prev_growth), factor_score: Number(row.factor_score) },
          description: `Growth recovery — growth factor surged from ${Number(row.prev_growth).toFixed(0)} to ${Number(row.growth_factor).toFixed(0)}.`,
        });
      }

      // Confidence Upgrades
      if (row.confidence_level && row.prev_confidence && row.confidence_level !== row.prev_confidence) {
        const levels = ['Low', 'Medium', 'High', 'Very High'];
        if (levels.indexOf(row.confidence_level) > levels.indexOf(row.prev_confidence)) {
          opps.push({
            symbol: sym, category: 'Confidence_Upgrade',
            score: Number(row.factor_score),
            factors: { confidence: levels.indexOf(row.confidence_level), factor_score: Number(row.factor_score) },
            description: `Confidence upgraded from ${row.prev_confidence} to ${row.confidence_level}. Data quality improving.`,
          });
        }
      }

      // Momentum Accelerations: momentum_factor increased >10 pts
      const momDelta = Number(row.momentum_factor || 0) - Number(row.prev_momentum || 0);
      if (momDelta > 10) {
        opps.push({
          symbol: sym, category: 'Momentum_Acceleration',
          score: Number(row.momentum_factor),
          factors: { momentum: Number(row.momentum_factor), momentum_delta: momDelta, factor_score: Number(row.factor_score) },
          description: `Momentum accelerating — +${momDelta.toFixed(0)} points to ${Number(row.momentum_factor).toFixed(0)}.`,
        });
      }
    }

    // TRACK-71: Opportunities are returned to caller.
    // No prediction_registry writes — that is PredictionRegistry's responsibility.

    return opps;
  }
}

export const opportunityEngine = new OpportunityEngine();
export default OpportunityEngine;
