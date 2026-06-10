/**
 * PredictionRegistryContract — Canonical prediction_registry column contract.
 * TRACK-P4B: Single source of truth for registry row shape.
 *
 * Every reader and writer must reference this contract.
 * No code may reference obsolete column names (health_score, predicted_at, factors, sample_size).
 */

// ── Canonical Column Names ──────────────────────────────────────────

export const REGISTRY_COLUMNS = [
  'id',
  'symbol',
  'prediction_date',
  'ranking_score',
  'classification',
  'confidence_score',
  'confidence_level',
  'quality_score',
  'growth_score',
  'value_score',
  'momentum_score',
  'risk_score',
  'sector_score',
  'price_at_prediction',
  'benchmark_level',
  'prediction_horizon',
  'validation_status',
  'validated_at',
  'future_return',
  'benchmark_return',
  'alpha',
  'created_at',
  'created_by',
] as const;

export type RegistryColumn = typeof REGISTRY_COLUMNS[number];

// ── Validated Enums ─────────────────────────────────────────────────

export const REGISTRY_CLASSIFICATIONS = [
  'Exceptional',
  'Excellent',
  'Good',
  'Fair',
  'Weak',
  'Critical',
] as const;

export type RegistryClassification = typeof REGISTRY_CLASSIFICATIONS[number];

export const REGISTRY_CONFIDENCE_LEVELS = [
  'Very High',
  'High',
  'Medium',
  'Low',
] as const;

export type RegistryConfidenceLevel = typeof REGISTRY_CONFIDENCE_LEVELS[number];

export const REGISTRY_VALIDATION_STATUSES = [
  'pending',
  'in_progress',
  'validated',
  'expired',
] as const;

export type RegistryValidationStatus = typeof REGISTRY_VALIDATION_STATUSES[number];

export const REGISTRY_CREATED_BY_VALUES = [
  'DailyPredictionCapture',
  'ManualSnapshot',
] as const;

export type RegistryCreatedBy = typeof REGISTRY_CREATED_BY_VALUES[number];

export const REGISTRY_PREDICTION_HORIZONS = [7, 30, 90, 180, 365] as const;

export type RegistryPredictionHorizon = typeof REGISTRY_PREDICTION_HORIZONS[number];

// ── Row Interfaces ──────────────────────────────────────────────────

/** Raw DB row shape (post mapping). All numeric columns are numbers. */
export interface RegistryRow {
  id: string;
  symbol: string;
  prediction_date: string;
  ranking_score: number;
  classification: RegistryClassification;
  confidence_score: number;
  confidence_level: RegistryConfidenceLevel;
  quality_score: number;
  growth_score: number;
  value_score: number;
  momentum_score: number;
  risk_score: number;
  sector_score: number;
  price_at_prediction: number | null;
  benchmark_level: number | null;
  prediction_horizon: RegistryPredictionHorizon;
  validation_status: RegistryValidationStatus;
  validated_at: string | null;
  future_return: number | null;
  benchmark_return: number | null;
  alpha: number | null;
  created_at: string;
  created_by: RegistryCreatedBy;
}

/** Input shape for creating a prediction. */
export interface CreatePredictionInput {
  symbol: string;
  predictionDate: string;
  rankingScore: number;
  classification: RegistryClassification;
  confidenceScore: number;
  confidenceLevel: RegistryConfidenceLevel;
  qualityScore: number;
  growthScore: number;
  valueScore: number;
  momentumScore: number;
  riskScore: number;
  sectorScore: number;
  priceAtPrediction: number | null;
  benchmarkLevel: number | null;
  predictionHorizon: RegistryPredictionHorizon;
  createdBy?: RegistryCreatedBy;
}

// ── Classification Mapping (StockStory → Registry) ─────────────────

/**
 * StockStory classifications map to registry classifications.
 * This is the ONE mapping used everywhere.
 */
export const STOCKSTORY_TO_REGISTRY_CLASSIFICATION: Record<string, RegistryClassification> = {
  Excellent: 'Excellent',
  Healthy: 'Good',
  Stable: 'Fair',
  Weakening: 'Weak',
  'At Risk': 'Critical',
};

/**
 * Registry classifications for display. Reverse mapping.
 */
export const REGISTRY_TO_STOCKSTORY_CLASSIFICATION: Record<RegistryClassification, string> = {
  Exceptional: 'Exceptional',
  Excellent: 'Excellent',
  Good: 'Good',
  Fair: 'Fair',
  Weak: 'Weak',
  Critical: 'Critical',
};

// ── Obsolete Column Names (rejected) ────────────────────────────────

/** These column names must NOT appear in any production query against prediction_registry. */
export const OBSOLETE_COLUMNS = [
  'health_score',   // → ranking_score
  'predicted_at',   // → prediction_date
  'factors',        // → quality/growth/value/momentum/risk/sector_score
  'sample_size',    // removed
  'prediction_level', // → confidence_level
] as const;

// ── Validation Helpers ──────────────────────────────────────────────

export function isValidClassification(v: string): v is RegistryClassification {
  return (REGISTRY_CLASSIFICATIONS as readonly string[]).includes(v);
}

export function isValidConfidenceLevel(v: string): v is RegistryConfidenceLevel {
  return (REGISTRY_CONFIDENCE_LEVELS as readonly string[]).includes(v);
}

export function isValidCreatedBy(v: string): v is RegistryCreatedBy {
  return (REGISTRY_CREATED_BY_VALUES as readonly string[]).includes(v);
}

export function isValidHorizon(v: number): v is RegistryPredictionHorizon {
  return (REGISTRY_PREDICTION_HORIZONS as readonly number[]).includes(v);
}

export function mapStockStoryClassification(ssClassification: string): RegistryClassification {
  const mapped = STOCKSTORY_TO_REGISTRY_CLASSIFICATION[ssClassification];
  if (!mapped) {
    throw new Error(`UNKNOWN_STOCKSTORY_CLASSIFICATION: ${ssClassification}`);
  }
  return mapped;
}

export function mapToRegistryInput(
  symbol: string,
  predictionDate: string,
  rankingScore: number,
  ssClassification: string,
  confidenceScore: number,
  qualityScore: number,
  growthScore: number,
  valueScore: number,
  momentumScore: number,
  riskScore: number,
  sectorScore: number,
  horizon: RegistryPredictionHorizon,
  priceAtPrediction: number | null,
  benchmarkLevel: number | null,
  createdBy: RegistryCreatedBy = 'DailyPredictionCapture',
): CreatePredictionInput {
  const classification = mapStockStoryClassification(ssClassification);
  const confidenceLevel: RegistryConfidenceLevel =
    confidenceScore >= 80 ? 'High' : confidenceScore >= 65 ? 'Medium' : 'Low';

  return {
    symbol,
    predictionDate,
    rankingScore,
    classification,
    confidenceScore,
    confidenceLevel,
    qualityScore,
    growthScore,
    valueScore,
    momentumScore,
    riskScore,
    sectorScore,
    priceAtPrediction,
    benchmarkLevel,
    predictionHorizon: horizon,
    createdBy,
  };
}

// ── Lineage Contract ────────────────────────────────────────────────

/**
 * Canonical lineage entries for prediction_registry data.
 * Every analytical response using registry data must expose this.
 */
export interface RegistryLineageEntry {
  sourceTable: 'prediction_registry';
  symbol: string;
  predictionDate: string;
  horizon: number;
  rankingScore: number;
  confidenceScore: number;
  retrievedAt: string;
  isFallback: false;
  isSynthetic: false;
}

export function makeRegistryLineage(
  row: Pick<RegistryRow, 'symbol' | 'prediction_date' | 'prediction_horizon' | 'ranking_score' | 'confidence_score'>,
): RegistryLineageEntry {
  return {
    sourceTable: 'prediction_registry',
    symbol: row.symbol,
    predictionDate: row.prediction_date,
    horizon: row.prediction_horizon,
    rankingScore: row.ranking_score,
    confidenceScore: row.confidence_score,
    retrievedAt: new Date().toISOString(),
    isFallback: false,
    isSynthetic: false,
  };
}
