/**
 * BenchmarkTracker — TRACK-32 Phase 8
 *
 * Tracks PSEi benchmark index levels on a daily basis using the PSE price
 * data pipeline. Benchmark levels are critical for computing
 * forward-validated alpha (excess return vs. market).
 *
 * NOTE: the underlying `benchmark_observations` table and this file's
 * lookup keys ('KSE100'/'KSE30'/'KSEALLSHARE') still use their original
 * column/symbol names. Renaming them requires a DB migration plus updating
 * whatever ingestion job writes rows with those symbol values — deferred
 * rather than guessed at here.
 */

import pool from '../db/index';
import type { BenchmarkObservation } from './types';

export class BenchmarkTracker {
  async recordObservation(date: string): Promise<BenchmarkObservation> {
    const indices = ['KSE100', 'KSE30', 'KSEALLSHARE'];

    const result = await pool.query(
      `SELECT symbol, close FROM daily_prices WHERE symbol = ANY($1) AND trade_date = $2`,
      [indices, date]
    );

    const priceMap: Record<string, number> = {};
    for (const row of result.rows) {
      priceMap[row.symbol] = Number(row.close);
    }

    const kse100 = priceMap['KSE100'] ?? null;
    const kse30 = priceMap['KSE30'] ?? null;
    const kseAll = priceMap['KSEALLSHARE'] ?? null;

    const insertResult = await pool.query(
      `INSERT INTO benchmark_observations (observed_date, kse100, kse30, kse_allshare)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (observed_date) DO UPDATE SET
         kse100 = EXCLUDED.kse100, kse30 = EXCLUDED.kse30,
         kse_allshare = EXCLUDED.kse_allshare, recorded_at = NOW()
       RETURNING observed_date, kse100, kse30, kse_allshare, recorded_at`,
      [date, kse100, kse30, kseAll]
    );

    const row = insertResult.rows[0];
    return {
      date: row.observed_date instanceof Date ? row.observed_date.toISOString().split('T')[0] : String(row.observed_date),
      psei: row.kse100 !== null ? Number(row.kse100) : 0,
      pseiTop10: row.kse30 !== null ? Number(row.kse30) : 0,
      pseAll: row.kse_allshare !== null ? Number(row.kse_allshare) : 0,
    };
  }

  async getObservations(from: string, to: string): Promise<BenchmarkObservation[]> {
    const result = await pool.query(
      `SELECT observed_date, kse100, kse30, kse_allshare FROM benchmark_observations
       WHERE observed_date >= $1 AND observed_date <= $2 ORDER BY observed_date ASC`,
      [from, to]
    );

    return result.rows.map(row => ({
      date: row.observed_date instanceof Date ? row.observed_date.toISOString().split('T')[0] : String(row.observed_date),
      psei: row.kse100 !== null ? Number(row.kse100) : 0,
      pseiTop10: row.kse30 !== null ? Number(row.kse30) : 0,
      pseAll: row.kse_allshare !== null ? Number(row.kse_allshare) : 0,
    }));
  }
}

export const benchmarkTracker = new BenchmarkTracker();
export default BenchmarkTracker;
