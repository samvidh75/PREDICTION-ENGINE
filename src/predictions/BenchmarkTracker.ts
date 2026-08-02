/**
 * BenchmarkTracker — TRACK-32 Phase 8
 *
 * Tracks PSEi benchmark index levels on a daily basis using the PSE price
 * data pipeline. Benchmark levels are critical for computing
 * forward-validated alpha (excess return vs. market).
 *
 * Only the PSEi composite ('PSEI' in daily_prices, the same symbol
 * DynamicWeightEngine uses) is a real, ingested ticker today. There is no
 * separate feed for a "PSEi Top 10" or "PSE All Shares" level, so those two
 * fields are reserved columns that stay null until such a source exists —
 * they are not backfilled with a substitute index.
 */

import pool from '../db/index';
import type { BenchmarkObservation } from './types';

const PSEI_SYMBOL = 'PSEI';

export class BenchmarkTracker {
  async recordObservation(date: string): Promise<BenchmarkObservation> {
    const result = await pool.query(
      `SELECT close FROM daily_prices WHERE symbol = $1 AND trade_date = $2`,
      [PSEI_SYMBOL, date]
    );

    const psei = result.rows[0]?.close != null ? Number(result.rows[0].close) : null;

    const insertResult = await pool.query(
      `INSERT INTO benchmark_observations (observed_date, psei)
       VALUES ($1, $2)
       ON CONFLICT (observed_date) DO UPDATE SET
         psei = EXCLUDED.psei, recorded_at = NOW()
       RETURNING observed_date, psei, psei_top10, pse_all_shares`,
      [date, psei]
    );

    const row = insertResult.rows[0];
    return {
      date: row.observed_date instanceof Date ? row.observed_date.toISOString().split('T')[0] : String(row.observed_date),
      psei: row.psei !== null ? Number(row.psei) : 0,
      pseiTop10: row.psei_top10 !== null ? Number(row.psei_top10) : 0,
      pseAll: row.pse_all_shares !== null ? Number(row.pse_all_shares) : 0,
    };
  }

  async getObservations(from: string, to: string): Promise<BenchmarkObservation[]> {
    const result = await pool.query(
      `SELECT observed_date, psei, psei_top10, pse_all_shares FROM benchmark_observations
       WHERE observed_date >= $1 AND observed_date <= $2 ORDER BY observed_date ASC`,
      [from, to]
    );

    return result.rows.map(row => ({
      date: row.observed_date instanceof Date ? row.observed_date.toISOString().split('T')[0] : String(row.observed_date),
      psei: row.psei !== null ? Number(row.psei) : 0,
      pseiTop10: row.psei_top10 !== null ? Number(row.psei_top10) : 0,
      pseAll: row.pse_all_shares !== null ? Number(row.pse_all_shares) : 0,
    }));
  }
}

export const benchmarkTracker = new BenchmarkTracker();
export default BenchmarkTracker;
