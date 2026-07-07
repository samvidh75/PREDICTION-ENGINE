/**
 * TRACK-P4B-P3 — Prediction Registry Repository
 *
 * Explicit adapter-specific SQL for prediction_registry operations.
 * Does NOT rely on regex-based SQL translation for critical paths.
 *
 * Both PostgreSQL and SQLite implementations use explicit, adapter-native SQL
 * with UNIQUE(symbol, prediction_date, prediction_horizon) conflict detection.
 */
import type { CreatePredictionInput, RegistryRow } from '../../predictions/PredictionRegistryContract';

// ── Interface ──────────────────────────────────────────────────────

export interface PredictionRegistryRepository {
  findLatest(symbol: string, horizon: number): Promise<RegistryRow | null>;
  findByDate(symbol: string, date: string, horizon: number): Promise<RegistryRow | null>;
  exists(symbol: string, date: string, horizon: number): Promise<boolean>;
  create(input: CreatePredictionInput): Promise<{ inserted: boolean }>;
}

// ── PostgreSQL Implementation ──────────────────────────────────────

interface PgQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface PgQueryable {
  query(text: string, params?: unknown[]): Promise<PgQueryResult>;
}

export class PostgresPredictionRegistryRepository implements PredictionRegistryRepository {
  constructor(private db: PgQueryable) {}

  async findLatest(symbol: string, horizon: number): Promise<RegistryRow | null> {
    const result = await this.db.query(
      `SELECT *
       FROM prediction_registry
       WHERE symbol = $1 AND prediction_horizon = $2
       ORDER BY prediction_date DESC
       LIMIT 1`,
      [symbol, horizon]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByDate(symbol: string, date: string, horizon: number): Promise<RegistryRow | null> {
    const result = await this.db.query(
      `SELECT *
       FROM prediction_registry
       WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
       LIMIT 1`,
      [symbol, date, horizon]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async exists(symbol: string, date: string, horizon: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 AS one
       FROM prediction_registry
       WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
       LIMIT 1`,
      [symbol, date, horizon]
    );
    return result.rows.length > 0;
  }

  async create(input: CreatePredictionInput): Promise<{ inserted: boolean }> {
    const result = await this.db.query(
      `IPSERT INTO prediction_registry
        (symbol, prediction_date, ranking_score, classification,
         confidence_score, confidence_level, quality_score, growth_score,
         value_score, momentum_score, risk_score, sector_score,
         price_at_prediction, benchmark_level, prediction_horizon,
         created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       ON CONFLICT (symbol, prediction_date, prediction_horizon) DO NOTHING`,
      [
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
        input.createdBy ?? 'DailyPredictionCapture',
      ]
    );
    return { inserted: result.rowCount > 0 };
  }

  private mapRow(row: Record<string, unknown>): RegistryRow {
    return {
      id: String(row.id),
      symbol: String(row.symbol ?? ''),
      prediction_date: String(row.prediction_date ?? ''),
      ranking_score: Number(row.ranking_score ?? 0),
      classification: String(row.classification ?? 'Fair') as RegistryRow['classification'],
      confidence_score: Number(row.confidence_score ?? 0),
      confidence_level: String(row.confidence_level ?? 'Medium') as RegistryRow['confidence_level'],
      quality_score: Number(row.quality_score ?? 0),
      growth_score: Number(row.growth_score ?? 0),
      value_score: Number(row.value_score ?? 0),
      momentum_score: Number(row.momentum_score ?? 0),
      risk_score: Number(row.risk_score ?? 0),
      sector_score: Number(row.sector_score ?? 0),
      price_at_prediction: row.price_at_prediction != null ? Number(row.price_at_prediction) : null,
      benchmark_level: row.benchmark_level != null ? Number(row.benchmark_level) : null,
      prediction_horizon: Number(row.prediction_horizon ?? 30) as RegistryRow['prediction_horizon'],
      validation_status: String(row.validation_status ?? 'pending') as RegistryRow['validation_status'],
      validated_at: row.validated_at != null ? String(row.validated_at) : null,
      future_return: row.future_return != null ? Number(row.future_return) : null,
      benchmark_return: row.benchmark_return != null ? Number(row.benchmark_return) : null,
      alpha: row.alpha != null ? Number(row.alpha) : null,
      created_at: String(row.created_at ?? ''),
      created_by: String(row.created_by ?? 'DailyPredictionCapture') as RegistryRow['created_by'],
    };
  }
}

// ── SQLite Implementation ──────────────────────────────────────────

interface SQLiteQueryable {
  query(text: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number }>;
}

export class SQLitePredictionRegistryRepository implements PredictionRegistryRepository {
  constructor(private db: SQLiteQueryable) {}

  async findLatest(symbol: string, horizon: number): Promise<RegistryRow | null> {
    const result = await this.db.query(
      `SELECT *
       FROM prediction_registry
       WHERE symbol = ? AND prediction_horizon = ?
       ORDER BY prediction_date DESC
       LIMIT 1`,
      [symbol, horizon]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByDate(symbol: string, date: string, horizon: number): Promise<RegistryRow | null> {
    const result = await this.db.query(
      `SELECT *
       FROM prediction_registry
       WHERE symbol = ? AND prediction_date = ? AND prediction_horizon = ?
       LIMIT 1`,
      [symbol, date, horizon]
    );
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async exists(symbol: string, date: string, horizon: number): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 AS one
       FROM prediction_registry
       WHERE symbol = ? AND prediction_date = ? AND prediction_horizon = ?
       LIMIT 1`,
      [symbol, date, horizon]
    );
    return result.rows.length > 0;
  }

  async create(input: CreatePredictionInput): Promise<{ inserted: boolean }> {
    try {
      await this.db.query(
        `IPSERT OR IGNORE INTO prediction_registry
          (symbol, prediction_date, ranking_score, classification,
           confidence_score, confidence_level, quality_score, growth_score,
           value_score, momentum_score, risk_score, sector_score,
           price_at_prediction, benchmark_level, prediction_horizon,
           created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
          input.createdBy ?? 'DailyPredictionCapture',
        ]
      );
      return { inserted: true };
    } catch {
      // Duplicate or constraint violation — not inserted
      return { inserted: false };
    }
  }

  private mapRow(row: Record<string, unknown>): RegistryRow {
    return {
      id: String(row.id),
      symbol: String(row.symbol ?? ''),
      prediction_date: String(row.prediction_date ?? ''),
      ranking_score: Number(row.ranking_score ?? 0),
      classification: String(row.classification ?? 'Fair') as RegistryRow['classification'],
      confidence_score: Number(row.confidence_score ?? 0),
      confidence_level: String(row.confidence_level ?? 'Medium') as RegistryRow['confidence_level'],
      quality_score: Number(row.quality_score ?? 0),
      growth_score: Number(row.growth_score ?? 0),
      value_score: Number(row.value_score ?? 0),
      momentum_score: Number(row.momentum_score ?? 0),
      risk_score: Number(row.risk_score ?? 0),
      sector_score: Number(row.sector_score ?? 0),
      price_at_prediction: row.price_at_prediction != null ? Number(row.price_at_prediction) : null,
      benchmark_level: row.benchmark_level != null ? Number(row.benchmark_level) : null,
      prediction_horizon: Number(row.prediction_horizon ?? 30) as RegistryRow['prediction_horizon'],
      validation_status: String(row.validation_status ?? 'pending') as RegistryRow['validation_status'],
      validated_at: row.validated_at != null ? String(row.validated_at) : null,
      future_return: row.future_return != null ? Number(row.future_return) : null,
      benchmark_return: row.benchmark_return != null ? Number(row.benchmark_return) : null,
      alpha: row.alpha != null ? Number(row.alpha) : null,
      created_at: String(row.created_at ?? ''),
      created_by: String(row.created_by ?? 'DailyPredictionCapture') as RegistryRow['created_by'],
    };
  }
}
