/**
 * ConfidenceV2Activator — TRACK-32 Phase 7
 *
 * Activates ConfidenceEngineV2 across all factor_snapshots for a given date.
 * Computes composite confidence scores using ConfidenceEngineV2.compute
 * and stores updated confidence_scores and confidence_levels back into
 * prediction_registry rows (updating only confidence fields — scores remain
 * immutable per the append-only contract).
 */

import pool from '../db/index';
import { ConfidenceEngineV2 } from '../quality/ConfidenceEngineV2';
// TRACK-71: This file UPDATEs confidence_score metadata only.
// Engine scores remain append-only immutable. For outcome writes, use OutcomeRepository.

export class ConfidenceV2Activator {
  private readonly engine = new ConfidenceEngineV2();

  async activateAndStore(referenceDate: string): Promise<{ activated: number; stored: number }> {
    console.info(`[ConfidenceV2Activator] Activating for ${referenceDate}...`);

    const snapshotsResult = await pool.query(
      `SELECT symbol, trade_date, quality_factor, growth_factor, value_factor,
              momentum_factor, risk_factor, sector_strength_factor,
              factor_score, confidence_score, confidence_level
       FROM factor_snapshots
       WHERE trade_date = $1
       ORDER BY factor_score DESC`,
      [referenceDate]
    );

    const snapshots = snapshotsResult.rows;
    const activated = snapshots.length;

    if (activated === 0) {
      console.info(`[ConfidenceV2Activator] No factor_snapshots found for ${referenceDate}`);
      return { activated: 0, stored: 0 };
    }

    const confidenceResults: Array<{ symbol: string; score: number; level: string }> = [];

    for (const row of snapshots) {
      const factorScores = {
        qualityFactor: Number(row.quality_factor),
        growthFactor: Number(row.growth_factor),
        valueFactor: Number(row.value_factor),
        momentumFactor: Number(row.momentum_factor),
        riskFactor: Number(row.risk_factor),
      };

      const fieldsPopulated = [
        row.quality_factor, row.growth_factor, row.value_factor,
        row.momentum_factor, row.risk_factor, row.sector_strength_factor,
      ].filter(v => v !== null && v !== undefined && isFinite(Number(v))).length;

      const result = this.engine.compute(fieldsPopulated, 6, {
        quality: 'DerivedMetricsEngine',
        growth: 'DerivedMetricsEngine',
        value: 'DerivedMetricsEngine',
        momentum: 'DerivedMetricsEngine',
        risk: 'DerivedMetricsEngine',
        sector: 'DerivedMetricsEngine',
      }, 0, factorScores);

      confidenceResults.push({ symbol: row.symbol, score: result.score, level: result.level });
    }

    let stored = 0;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const cr of confidenceResults) {
        const updateResult = await client.query(
          `UPDATE prediction_registry
           SET confidence_score = $1, confidence_level = $2
           WHERE symbol = $3 AND prediction_date = $4 AND validation_status = 'pending'`,
          [cr.score, cr.level, cr.symbol, referenceDate]
        );
        stored += updateResult.rowCount ?? 0;
      }

      for (const cr of confidenceResults) {
        await client.query(
          `UPDATE factor_snapshots SET confidence_score = $1, confidence_level = $2
           WHERE symbol = $3 AND trade_date = $4`,
          [cr.score, cr.level, cr.symbol, referenceDate]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    console.info(`[ConfidenceV2Activator] Complete. Activated: ${activated}, Stored: ${stored}`);
    return { activated, stored };
  }
}

export const confidenceV2Activator = new ConfidenceV2Activator();
export default ConfidenceV2Activator;
