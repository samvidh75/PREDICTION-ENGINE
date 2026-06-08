/**
 * TRACK-P2 — Shared Analytical Response Contract
 * 
 * Central types for honest data states, lineage, freshness, and completeness.
 * Every production analytical API must use or be compatible with this contract.
 */

// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type DataFreshness =
  | 'live'
  | 'recent'
  | 'stale'
  | 'expired'
  | 'unknown';

export type DataAvailability =
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'demo';

export type ResponseMode =
  | 'production_real'
  | 'production_partial'
  | 'production_unavailable'
  | 'demo';

export type ResponseStatus =
  | 'ok'
  | 'partial'
  | 'unavailable'
  | 'empty'
  | 'error'
  | 'demo';

/**
 * Reason codes for analytical responses.
 * Distinguishes between empty, unavailable, error, and demo states.
 */
export type AnalyticalReasonCode =
  | 'BACKEND_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'SNAPSHOT_NOT_GENERATED'
  | 'FEATURE_SNAPSHOT_MISSING'
  | 'FACTOR_SNAPSHOT_MISSING'
  | 'FINANCIAL_SNAPSHOT_MISSING'
  | 'FEATURE_OR_FACTOR_SNAPSHOT_MISSING'
  | 'PREDICTION_NOT_FOUND'
  | 'EMPTY_PORTFOLIO'
  | 'NO_SIGNIFICANT_SIGNALS'
  | 'DEMO_MODE'
  | 'STALE_DATA'
  | 'PARTIAL_DATA'
  | 'VALIDATION_LIMITED'
  | 'OK';

// ---------------------------------------------------------------------------
// Lineage
// ---------------------------------------------------------------------------

export interface DataLineageEntry {
  sourceTable: string;
  sourceField?: string;
  provider?: string | null;
  asOf?: string | null;
  retrievedAt?: string | null;
  isFallback: boolean;
  isSynthetic: false;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// Freshness
// ---------------------------------------------------------------------------

export interface DataFreshnessResult {
  freshness: DataFreshness;
  asOf: string | null;
  ageMinutes: number | null;
  ageHours: number | null;
  ageDays: number | null;
  reason: string | null;
}

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

export interface DataCompleteness {
  score: number; // 0–100
  requiredFields: number;
  availableFields: number;
  missingFields: string[];
  neutralizedFields: string[];
  confidenceImpact: number; // 0–100; how much confidence should be reduced
}

export interface CompletenessInput {
  requiredFields: string[];
  values: Record<string, number | string | null | undefined>;
  criticalFields?: string[];
  neutralizedFields?: string[];
}

// ---------------------------------------------------------------------------
// Data State (aggregate of freshness + completeness + lineage)
// ---------------------------------------------------------------------------

export interface DataState {
  availability: DataAvailability;
  freshness: DataFreshness;
  asOf: string | null;
  missingInputs: string[];
  neutralizedFields: string[];
  completenessScore: number;
  lineage: DataLineageEntry[];
}

// ---------------------------------------------------------------------------
// Analytical Response Envelope
// ---------------------------------------------------------------------------

export interface AnalyticalResponse<T = unknown> {
  status: ResponseStatus;
  mode: ResponseMode;
  data: T | null;
  reason: AnalyticalReasonCode | null;
  message: string | null;
  generatedAt: string;
  dataState: DataState;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function buildDataState(params: {
  availability: DataAvailability;
  freshness: DataFreshness;
  asOf?: string | null;
  missingInputs?: string[];
  neutralizedFields?: string[];
  completenessScore?: number;
  lineage?: DataLineageEntry[];
}): DataState {
  return {
    availability: params.availability,
    freshness: params.freshness,
    asOf: params.asOf ?? null,
    missingInputs: params.missingInputs ?? [],
    neutralizedFields: params.neutralizedFields ?? [],
    completenessScore: params.completenessScore ?? 0,
    lineage: params.lineage ?? [],
  };
}

export function buildAnalyticalResponse<T>(params: {
  status: ResponseStatus;
  mode: ResponseMode;
  data?: T | null;
  reason?: AnalyticalReasonCode | null;
  message?: string | null;
  dataState: DataState;
}): AnalyticalResponse<T> {
  return {
    status: params.status,
    mode: params.mode,
    data: params.data ?? null,
    reason: params.reason ?? null,
    message: params.message ?? null,
    generatedAt: new Date().toISOString(),
    dataState: params.dataState,
  };
}

/**
 * Create an unavailable response with the appropriate reason code.
 */
export function unavailableResponse<T>(
  reason: AnalyticalReasonCode,
  message: string,
  missingInputs: string[] = []
): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'unavailable',
    mode: 'production_unavailable',
    reason,
    message,
    dataState: buildDataState({
      availability: 'unavailable',
      freshness: 'unknown',
      missingInputs,
    }),
  });
}

/**
 * Create a partial response.
 */
export function partialResponse<T>(
  reason: AnalyticalReasonCode,
  message: string,
  data: T,
  missingInputs: string[],
  completenessScore: number,
  lineage: DataLineageEntry[],
  asOf?: string | null
): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'partial',
    mode: 'production_partial',
    reason,
    message,
    data,
    dataState: buildDataState({
      availability: 'partial',
      freshness: 'recent',
      asOf: asOf ?? null,
      missingInputs,
      completenessScore,
      lineage,
    }),
  });
}

/**
 * Create a successful real-data response.
 */
export function realResponse<T>(
  data: T,
  freshness: DataFreshness,
  asOf: string | null,
  completenessScore: number,
  lineage: DataLineageEntry[],
  reason: AnalyticalReasonCode = 'OK',
  neutralizedFields: string[] = []
): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'ok',
    mode: 'production_real',
    reason,
    data,
    message: null,
    dataState: buildDataState({
      availability: 'available',
      freshness,
      asOf: asOf ?? null,
      completenessScore,
      lineage,
      neutralizedFields,
    }),
  });
}

/**
 * Create a demo response.
 */
export function demoResponse<T>(data: T, message?: string): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'demo',
    mode: 'demo',
    reason: 'DEMO_MODE',
    message: message ?? 'This is a sample for demonstration purposes.',
    data,
    dataState: buildDataState({
      availability: 'demo',
      freshness: 'unknown',
    }),
  });
}

/**
 * Create an empty (valid) response.
 */
export function emptyResponse<T>(
  reason: AnalyticalReasonCode,
  message: string,
  freshness: DataFreshness = 'unknown',
  asOf?: string | null,
  lineage?: DataLineageEntry[]
): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'empty',
    mode: 'production_real',
    reason,
    message,
    dataState: buildDataState({
      availability: 'available',
      freshness,
      asOf: asOf ?? null,
      lineage: lineage ?? [],
    }),
  });
}

/**
 * Create an error response.
 */
export function errorResponse<T>(
  reason: AnalyticalReasonCode,
  message: string
): AnalyticalResponse<T> {
  return buildAnalyticalResponse<T>({
    status: 'error',
    mode: 'production_unavailable',
    reason,
    message,
    dataState: buildDataState({
      availability: 'unavailable',
      freshness: 'unknown',
    }),
  });
}
