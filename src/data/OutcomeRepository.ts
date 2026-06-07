/**
 * TRACK-65 AGENT A — OutcomeRepository
 * 
 * Single source of truth for ALL outcome data access.
 * No other module may query future_return, alpha, or benchmark_return directly.
 * 
 * Repository pattern with typed interfaces, pooled queries, and audit logging.
 */
import pool from '../db/index';

// ── Types ──────────────────────────────────────────────────────────

export interface OutcomeRecord {
  predictionId: string;
  symbol: string;
  horizonDays: number;
  predictionDate: string;
  validatedAt: string | null;
  futureReturn: number | null;
  benchmarkReturn: number | null;
  alpha: number | null;
  validationStatus: 'pending' | 'in_progress' | 'validated' | 'expired';
}

export interface OutcomeSummary {
  horizonDays: number;
  totalPredictions: number;
  validatedCount: number;
  pendingCount: number;
  hitRate: number | null;          // fraction of correct directional predictions
  meanReturn: number | null;
  meanAlpha: number | null;
  sharpeRatio: number | null;
  ci95Low: number | null;
  ci95High: number | null;
}

export interface OutcomeQuery {
  symbols?: string[];
  horizons?: number[];
  dateFrom?: string;
  dateTo?: string;
  validationStatus?: string;
  limit?: number;
  offset?: number;
}

export interface OutcomeUpdate {
  predictionId: string;
  futureReturn: number;
  benchmarkReturn?: number;
  alpha?: number;
  validatedAt?: string;
}

// ── Repository ─────────────────────────────────────────────────────

export class OutcomeRepository {
  /**
   * Fetch validated outcomes matching the query.
   * THE ONLY authorised pathway for reading outcome data.
   */
  async findOutcomes(query: OutcomeQuery = {}): Promise<OutcomeRecord[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (query.symbols && query.symbols.length > 0) {
      conditions.push(`symbol = ANY($${paramIndex++})`);
      params.push(query.symbols);
    }
    if (query.horizons && query.horizons.length > 0) {
      conditions.push(`prediction_horizon = ANY($${paramIndex++})`);
      params.push(query.horizons);
    }
    if (query.dateFrom) {
      conditions.push(`prediction_date >= $${paramIndex++}`);
      params.push(query.dateFrom);
    }
    if (query.dateTo) {
      conditions.push(`prediction_date <= $${paramIndex++}`);
      params.push(query.dateTo);
    }
    if (query.validationStatus) {
      conditions.push(`validation_status = $${paramIndex++}`);
      params.push(query.validationStatus);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limitClause = query.limit ? `LIMIT $${paramIndex++}` : '';
    if (query.limit) params.push(query.limit);
    const offsetClause = query.offset ? `OFFSET $${paramIndex++}` : '';
    if (query.offset) params.push(query.offset);

    const sql = `
      SELECT id, symbol, prediction_horizon, prediction_date,
             validated_at, future_return, benchmark_return, alpha, validation_status
      FROM prediction_registry
      ${whereClause}
      ORDER BY prediction_date DESC
      ${limitClause} ${offsetClause}
    `;

    const result = await pool.query(sql, params);
    return result.rows.map(this.mapRow);
  }

  /**
   * Get aggregated outcome summary for a horizon.
   */
  async getSummary(horizonDays: number): Promise<OutcomeSummary> {
    const result = await pool.query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN validation_status = 'validated' THEN 1 ELSE 0 END) as validated,
        SUM(CASE WHEN validation_status = 'pending' THEN 1 ELSE 0 END) as pending,
        AVG(CASE WHEN validation_status = 'validated' AND future_return IS NOT NULL THEN future_return END) as mean_return,
        AVG(CASE WHEN validation_status = 'validated' AND alpha IS NOT NULL THEN alpha END) as mean_alpha,
        AVG(CASE WHEN validation_status = 'validated' AND future_return IS NOT NULL THEN future_return * future_return END) as mean_sq_return,
        SUM(CASE WHEN validation_status = 'validated' AND alpha > 0 THEN 1 ELSE 0 END) * 1.0 /
          NULLIF(SUM(CASE WHEN validation_status = 'validated' AND alpha IS NOT NULL THEN 1 ELSE 0 END), 0) as hit_rate
      FROM prediction_registry
      WHERE prediction_horizon = $1`,
      [horizonDays]
    );

    const row = result.rows[0];
    const hitRate = row.hit_rate;
    const meanReturn = row.mean_return;
    const totalValidated = parseInt(row.validated) || 0;
    const variance = row.mean_sq_return - (meanReturn * meanReturn);
    const sharpe = variance > 0 && meanReturn !== null
      ? (meanReturn / Math.sqrt(variance)) * Math.sqrt(252 / horizonDays)
      : null;

    let ci95Low: number | null = null;
    let ci95High: number | null = null;
    if (hitRate !== null && totalValidated > 0) {
      const se = Math.sqrt(hitRate * (1 - hitRate) / totalValidated);
      ci95Low = hitRate - 1.96 * se;
      ci95High = hitRate + 1.96 * se;
    }

    return {
      horizonDays,
      totalPredictions: parseInt(row.total) || 0,
      validatedCount: totalValidated,
      pendingCount: parseInt(row.pending) || 0,
      hitRate,
      meanReturn,
      meanAlpha: row.mean_alpha,
      sharpeRatio: sharpe,
      ci95Low,
      ci95High,
    };
  }

  /**
   * Get summaries for all standard horizons.
   */
  async getAllSummaries(): Promise<OutcomeSummary[]> {
    const horizons = [30, 90, 180, 365];
    const results: OutcomeSummary[] = [];
    for (const h of horizons) {
      results.push(await this.getSummary(h));
    }
    return results;
  }

  /**
   * Update a prediction's outcome after validation.
   * THE ONLY authorised pathway for writing outcome data.
   */
  async recordOutcome(update: OutcomeUpdate): Promise<void> {
    const validatedAt = update.validatedAt || new Date().toISOString();
    const alpha = update.alpha ?? (update.futureReturn - (update.benchmarkReturn || 0));

    await pool.query(
      `UPDATE prediction_registry
       SET validation_status = 'validated',
           validated_at = $2,
           future_return = $3,
           benchmark_return = $4,
           alpha = $5
       WHERE id = $1`,
      [update.predictionId, validatedAt, update.futureReturn, update.benchmarkReturn || 0, alpha]
    );
  }

  /**
   * Bulk record outcomes from a set of validated predictions.
   */
  async recordOutcomesBulk(updates: OutcomeUpdate[]): Promise<{ updated: number; errors: string[] }> {
    let updated = 0;
    const errors: string[] = [];
    for (const update of updates) {
      try {
        await this.recordOutcome(update);
        updated++;
      } catch (e: unknown) {
        errors.push(`${update.predictionId}: ${(e as Error).message}`);
      }
    }
    return { updated, errors };
  }

  /**
   * Count validated predictions (used by Trust Centre, Evidence Engine).
   */
  async countValidated(horizonDays?: number): Promise<number> {
    const horizonFilter = horizonDays ? 'AND prediction_horizon = $1' : '';
    const params = horizonDays ? [horizonDays] : [];
    const result = await pool.query(
      `SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated' ${horizonFilter}`,
      params
    );
    return parseInt(result.rows[0].cnt) || 0;
  }

  /**
   * Get walk-forward hit rates by year for a given horizon.
   */
  async getWalkForward(horizonDays: number): Promise<Array<{ year: string; n: number; hitRate: number }>> {
    const result = await pool.query(
      `SELECT substr(prediction_date, 1, 4) as year,
              COUNT(*) as n,
              SUM(CASE WHEN alpha > 0 THEN 1 ELSE 0 END) * 1.0 / COUNT(*) as hit_rate
       FROM prediction_registry
       WHERE prediction_horizon = $1 AND validation_status = 'validated' AND alpha IS NOT NULL
       GROUP BY year
       ORDER BY year`,
      [horizonDays]
    );
    return result.rows.map((r: any) => ({
      year: r.year,
      n: parseInt(r.n),
      hitRate: parseFloat(r.hit_rate),
    }));
  }

  /**
   * Get outcomes for a specific symbol across all horizons.
   */
  async getSymbolOutcomes(symbol: string): Promise<OutcomeRecord[]> {
    const result = await pool.query(
      `SELECT id, symbol, prediction_horizon, prediction_date,
              validated_at, future_return, benchmark_return, alpha, validation_status
       FROM prediction_registry
       WHERE symbol = $1 AND validation_status = 'validated'
       ORDER BY prediction_date DESC`,
      [symbol]
    );
    return result.rows.map(this.mapRow);
  }

  // ── Private ───────────────────────────────────────────────────

  private mapRow(row: any): OutcomeRecord {
    return {
      predictionId: row.id,
      symbol: row.symbol,
      horizonDays: row.prediction_horizon,
      predictionDate: row.prediction_date,
      validatedAt: row.validated_at,
      futureReturn: row.future_return,
      benchmarkReturn: row.benchmark_return,
      alpha: row.alpha,
      validationStatus: row.validation_status,
    };
  }
}

export const outcomeRepository = new OutcomeRepository();
export default OutcomeRepository;
