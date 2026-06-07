/**
 * BenchmarkTracker — TRACK-32 Phase 8
 *
 * Tracks benchmark index levels (NIFTY 50, NIFTY 100, NIFTY 500)
 * on a daily basis. Stores observations in the benchmark_observations table
 * and provides query methods for retrieval.
 *
 * Benchmark levels are critical for computing forward-validated alpha
 * (excess return vs. market) and for contextualizing prediction performance.
 */

import pool from '../db/index';
import type { BenchmarkObservation } from './types';

export class BenchmarkTracker {
  /**
   * Record a benchmark observation for a given date.
   *
   * Fetches NIFTY 50, NIFTY 100, and NIFTY 500 closing prices from daily_prices.
   * Inserts into benchmark_observations table.
   * Returns the created observation.
   */
  async recordObservation(date: string): Promise<BenchmarkObservation> {
    // Fetch benchmark index closes from daily_prices
    // Index symbols: NIFTY 50, NIFTY 100, NIFTY 500
    const indices = ['NIFTY 50', 'NIFTY 100', 'NIFTY 500'];

    const result = await pool.query(
      `SELECT symbol, close
       FROM daily_prices
       WHERE symbol = ANY($1)
         AND trade_date = $2`,
      [indices, date]
    );

    // Build a map from symbol → close price
    const priceMap: Record<string, number> = {};
    for (const row of result.rows) {
      priceMap[row.symbol] = Number(row.close);
    }

    const nifty50 = priceMap['NIFTY 50'] ?? null;
    const nifty100 = priceMap['NIFTY 100'] ?? null;
    const nifty500 = priceMap['NIFTY 500'] ?? null;

    // Insert into benchmark_observations (upsert on observed_date)
    const insertResult = await pool.query(
      `INSERT INTO benchmark_observations (observed_date, nifty50, nifty100, nifty500)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (observed_date) DO UPDATE SET
         nifty50 = EXCLUDED.nifty50,
         nifty100 = EXCLUDED.nifty100,
         nifty500 = EXCLUDED.nifty500,
         recorded_at = NOW()
       RETURNING observed_date, nifty50, nifty100, nifty500, recorded_at`,
      [date, nifty50, nifty100, nifty500]
    );

    const row = insertResult.rows[0];

    return {
      date: row.observed_date instanceof Date
        ? row.observed_date.toISOString().split('T')[0]
        : String(row.observed_date),
      nifty50: row.nifty50 !== null ? Number(row.nifty50) : 0,
      nifty100: row.nifty100 !== null ? Number(row.nifty100) : 0,
      nifty500: row.nifty500 !== null ? Number(row.nifty500) : 0,
    };
  }

  /**
   * Get benchmark observations between from and to dates (inclusive).
   * Returns observations ordered by date ascending for time-series analysis.
   */
  async getObservations(from: string, to: string): Promise<BenchmarkObservation[]> {
    const result = await pool.query(
      `SELECT observed_date, nifty50, nifty100, nifty500
       FROM benchmark_observations
       WHERE observed_date >= $1
         AND observed_date <= $2
       ORDER BY observed_date ASC`,
      [from, to]
    );

    return result.rows.map(row => ({
      date: row.observed_date instanceof Date
        ? row.observed_date.toISOString().split('T')[0]
        : String(row.observed_date),
      nifty50: row.nifty50 !== null ? Number(row.nifty50) : 0,
      nifty100: row.nifty100 !== null ? Number(row.nifty100) : 0,
      nifty500: row.nifty500 !== null ? Number(row.nifty500) : 0,
    }));
  }
}

export const benchmarkTracker = new BenchmarkTracker();
export default BenchmarkTracker;