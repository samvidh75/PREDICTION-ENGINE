/**
 * PredictionRegistry — TRACK-32 Phase 1
 *
 * Immutable prediction record store. Append-only. No updates after creation.
 * Predictions are frozen before outcomes occur — no retroactive edits.
 *
 * Invariants enforced at the application level:
 *   1. Records are INSERT-only (no UPDATE queries)
 *   2. created_at and all engine scores are frozen at creation time
 *   3. Validation data (future_return, benchmark_return, alpha) are set
 *      only during validation, after the prediction horizon has passed
 *   4. Every record has an audit timestamp
 */

import pool from '../db/index';
import type {
  PredictionRecord,
  PredictionSlice,
  ValidationStatus,
  Classification,
  ConfidenceLevel,
  CreatePredictionInput,
} from './types';

export class PredictionRegistry {
  /**
   * Create a new prediction record. INSERT-only — no UPDATE path.
   * Returns the created record.
   */
  async createPrediction(input: CreatePredictionInput): Promise<PredictionRecord> {
    const id = crypto.randomUUID();
    const createdBy = input.createdBy || 'DailyPredictionCapture';

    const result = await pool.query(
      `INSERT INTO prediction_registry (
        id, symbol, prediction_date, ranking_score, classification,
        confidence_score, confidence_level,
        quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
        price_at_prediction, benchmark_level, prediction_horizon,
        validation_status, created_by
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10, $11, $12, $13,
        $14, $15, $16,
        'pending', $17
      ) RETURNING *`,
      [
        id,
        input.symbol,
        input.predictionDate,
        input.rankingScore,
        input.classification,
        input.confidenceScore,
        input.confidenceLevel,
        input.qualityScore,
        input.growthScore,
        input.valueScore,
        input.momentumScore,
        input.riskScore,
        input.sectorScore,
        input.priceAtPrediction,
        input.benchmarkLevel,
        input.predictionHorizon,
        createdBy,
      ]
    );

    return this.mapRowToRecord(result.rows[0]);
  }

  /**
   * Batch create predictions. All-or-nothing via DB transaction.
   */
  async createPredictionsBatch(inputs: CreatePredictionInput[]): Promise<PredictionRecord[]> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const records: PredictionRecord[] = [];

      for (const input of inputs) {
        const id = crypto.randomUUID();
        const createdBy = input.createdBy || 'DailyPredictionCapture';

        const result = await client.query(
          `INSERT INTO prediction_registry (
            id, symbol, prediction_date, ranking_score, classification,
            confidence_score, confidence_level,
            quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
            price_at_prediction, benchmark_level, prediction_horizon,
            validation_status, created_by
          ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, $15, $16,
            'pending', $17
          ) RETURNING *`,
          [
            id,
            input.symbol,
            input.predictionDate,
            input.rankingScore,
            input.classification,
            input.confidenceScore,
            input.confidenceLevel,
            input.qualityScore,
            input.growthScore,
            input.valueScore,
            input.momentumScore,
            input.riskScore,
            input.sectorScore,
            input.priceAtPrediction,
            input.benchmarkLevel,
            input.predictionHorizon,
            createdBy,
          ]
        );

        records.push(this.mapRowToRecord(result.rows[0]));
      }

      await client.query('COMMIT');
      return records;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Mark predictions as validated with outcome data.
   * This is the ONLY write path that modifies existing records.
   * Only updates validation_status, validated_at, future_return, benchmark_return, alpha.
   * Engine scores and prediction metadata remain immutable.
   */
  async validatePrediction(
    id: string,
    futureReturn: number,
    benchmarkReturn: number,
    alpha: number,
  ): Promise<PredictionRecord | null> {
    const result = await pool.query(
      `UPDATE prediction_registry
       SET validation_status = 'validated',
           validated_at = NOW(),
           future_return = $2,
           benchmark_return = $3,
           alpha = $4
       WHERE id = $1
         AND validation_status IN ('pending', 'in_progress')
       RETURNING *`,
      [id, futureReturn, benchmarkReturn, alpha]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToRecord(result.rows[0]);
  }

  /**
   * Get predictions by date range.
   */
  async getPredictionsByDateRange(
    startDate: string,
    endDate: string,
    options?: { horizon?: number; status?: ValidationStatus },
  ): Promise<PredictionRecord[]> {
    let query = `SELECT * FROM prediction_registry WHERE prediction_date >= $1 AND prediction_date <= $2`;
    const params: any[] = [startDate, endDate];

    if (options?.horizon) {
      params.push(options.horizon);
      query += ` AND prediction_horizon = $${params.length}`;
    }
    if (options?.status) {
      params.push(options.status);
      query += ` AND validation_status = $${params.length}`;
    }

    query += ` ORDER BY prediction_date DESC, ranking_score DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(this.mapRowToRecord);
  }

  /**
   * Get all pending predictions ready for validation (horizon has passed).
   */
  async getPendingPredictionsPastHorizon(
    horizonDays: number,
    referenceDate: string,
  ): Promise<PredictionRecord[]> {
    const cutoffDate = new Date(referenceDate);
    cutoffDate.setDate(cutoffDate.getDate() - horizonDays);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT * FROM prediction_registry
       WHERE prediction_horizon = $1
         AND validation_status IN ('pending', 'in_progress')
         AND prediction_date <= $2
       ORDER BY prediction_date ASC`,
      [horizonDays, cutoffStr]
    );

    return result.rows.map(this.mapRowToRecord);
  }

  /**
   * Count validated predictions. Critical for the 30-prediction threshold.
   */
  async countValidatedPredictions(): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated'`
    );
    return parseInt(result.rows[0].cnt, 10);
  }

  /**
   * Get validated predictions for statistical analysis.
   */
  async getValidatedPredictions(
    options?: { minDate?: string; maxDate?: string; horizon?: number },
  ): Promise<PredictionRecord[]> {
    let query = `SELECT * FROM prediction_registry WHERE validation_status = 'validated'`;
    const params: any[] = [];

    if (options?.minDate) {
      params.push(options.minDate);
      query += ` AND prediction_date >= $${params.length}`;
    }
    if (options?.maxDate) {
      params.push(options.maxDate);
      query += ` AND prediction_date <= $${params.length}`;
    }
    if (options?.horizon) {
      params.push(options.horizon);
      query += ` AND prediction_horizon = $${params.length}`;
    }

    query += ` ORDER BY prediction_date DESC`;
    const result = await pool.query(query, params);
    return result.rows.map(this.mapRowToRecord);
  }

  /**
   * Store a daily prediction snapshot (Phase 2).
   */
  async storeDailySnapshot(snapshot: PredictionSlice): Promise<void> {
    await pool.query(
      `INSERT INTO daily_prediction_snapshots (
        snapshot_date, n_symbols_ranked, benchmark_level,
        top10, top25, top50, bottom10, bottom25
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (snapshot_date) DO UPDATE SET
        n_symbols_ranked = EXCLUDED.n_symbols_ranked,
        benchmark_level = EXCLUDED.benchmark_level,
        top10 = EXCLUDED.top10,
        top25 = EXCLUDED.top25,
        top50 = EXCLUDED.top50,
        bottom10 = EXCLUDED.bottom10,
        bottom25 = EXCLUDED.bottom25`,
      [
        snapshot.date,
        snapshot.n_symbols_ranked,
        snapshot.benchmark_level,
        JSON.stringify(snapshot.top10),
        JSON.stringify(snapshot.top25),
        JSON.stringify(snapshot.top50),
        JSON.stringify(snapshot.bottom10),
        JSON.stringify(snapshot.bottom25),
      ]
    );
  }

  /**
   * Get daily snapshots for analysis.
   */
  async getDailySnapshots(since?: string): Promise<PredictionSlice[]> {
    let query = `SELECT * FROM daily_prediction_snapshots`;
    const params: any[] = [];

    if (since) {
      params.push(since);
      query += ` WHERE snapshot_date >= $1`;
    }

    query += ` ORDER BY snapshot_date DESC`;
    const result = await pool.query(query, params);

    return result.rows.map(row => ({
      date: row.snapshot_date instanceof Date
        ? row.snapshot_date.toISOString().split('T')[0]
        : String(row.snapshot_date),
      top10: typeof row.top10 === 'string' ? JSON.parse(row.top10) : row.top10,
      top25: typeof row.top25 === 'string' ? JSON.parse(row.top25) : row.top25,
      top50: typeof row.top50 === 'string' ? JSON.parse(row.top50) : row.top50,
      bottom10: typeof row.bottom10 === 'string' ? JSON.parse(row.bottom10) : row.bottom10,
      bottom25: typeof row.bottom25 === 'string' ? JSON.parse(row.bottom25) : row.bottom25,
      benchmark_level: Number(row.benchmark_level),
      n_symbols_ranked: row.n_symbols_ranked,
    }));
  }

  // ── Private helpers ──────────────────────────────────────

  private mapRowToRecord(row: any): PredictionRecord {
    return {
      id: row.id,
      symbol: row.symbol,
      prediction_date: row.prediction_date instanceof Date
        ? row.prediction_date.toISOString().split('T')[0]
        : String(row.prediction_date),
      ranking_score: Number(row.ranking_score),
      classification: row.classification,
      confidence_score: Number(row.confidence_score),
      confidence_level: row.confidence_level,
      quality_score: Number(row.quality_score),
      growth_score: Number(row.growth_score),
      value_score: Number(row.value_score),
      momentum_score: Number(row.momentum_score),
      risk_score: Number(row.risk_score),
      sector_score: Number(row.sector_score),
      price_at_prediction: row.price_at_prediction != null ? Number(row.price_at_prediction) : null,
      benchmark_level: row.benchmark_level != null ? Number(row.benchmark_level) : null,
      prediction_horizon: row.prediction_horizon,
      validation_status: row.validation_status,
      validated_at: row.validated_at instanceof Date
        ? row.validated_at.toISOString()
        : row.validated_at,
      future_return: row.future_return !== null ? Number(row.future_return) : null,
      benchmark_return: row.benchmark_return !== null ? Number(row.benchmark_return) : null,
      alpha: row.alpha !== null ? Number(row.alpha) : null,
      created_at: row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
      created_by: row.created_by,
    };
  }
}

export const predictionRegistry = new PredictionRegistry();
export default PredictionRegistry;
