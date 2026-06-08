/**
 * TRACK-P2 — Shared Analytical Response Contract
 *
 * Central types for honest data states, lineage, freshness, and completeness.
 * Every production analytical API must use or be compatible with this contract.
 *
 * DESIGN NOTE: reason codes are typed as `string` (not a narrow union) so routes
 * can add new codes without updating this contract. The known codes are documented
 * here as the canonical set but the type system does not restrict them.
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
 * Known reason codes used across routes.
 * The type is `string` to allow routes to add new codes without contract changes.
 *
 * Canonical codes:
 *   BACKEND_UNAVAILABLE    — backend process or runtime is down
 *   DATABASE_UNAVAILABLE   — database connection failure
 *   SNAPSHOT_NOT_GENERATED — prediction/feature/factor snapshots never generated
 *   FEATURE_SNAPSHOT_MISSING
 *   FACTOR_SNAPSHOT_MISSING
 *   FINANCIAL_SNAPSHOT_MISSING
 *   FEATURE_OR_FACTOR_SNAPSHOT_MISSING
 *   PREDICTION_NOT_FOUND   — symbol exists but no prediction_registry row
 *   EMPTY_PORTFOLIO        — user supplied no positions
 *   ALL_POSITIONS_REJECTED — all positions invalid
 *   NO_SIGNIFICANT_SIGNALS — snapshot exists but no meaningful diffs
 *   DEMO_MODE              — explicit demo request
 *   STALE_DATA
 *   PARTIAL_DATA
 *   VALIDATION_LIMITED     — sample size too small for reliability claims
 *   INTERNAL_ERROR         — unexpected server error
 *   INVALID_POSITIONS_FORMAT
 *   OK                     — healthy production-real response
 */
export type AnalyticalReasonCode = string;

// ---------------------------------------------------------------------------
// Lineage
// ---------------------------------------------------------------------------

export interface DataLineageEntry {
  sourceTable: string;
  /** Field name within the source table, or null if not applicable. */
  sourceField?: string | null;
  /** Data provider name, or null if unknown / internal pipeline. */
  provider?: string | null;
  /** Timestamp of the source data (ISO string or null). */
  asOf?: string | null;
  /** When the data was retrieved (ISO string or null). */
  retrievedAt?: string | null;
  /** True if this entry was produced by a fallback path. */
  isFallback: boolean;
  /** Must be false — synthetic data is not allowed in production responses. */
  isSynthetic: false;
  /** Optional human-readable notes. */
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
  reason: string | null;
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
  reason?: string | null;
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
 * Convenience: extract the freshness string from a DataFreshnessResult.
 */
export function freshnessFrom(fr: { freshness: DataFreshness }): DataFreshness {
  return fr.freshness;
}

/**
 * Convenience: extract the asOf from a DataFreshnessResult.
 */
export function asOfFrom(fr: { asOf: string | null }): string | null {
  return fr.asOf;
}

/**
 * Create an unavailable response with the appropriate reason code.
 */
export function unavailableResponse<T>(
  reason: string,
  message: string,
  missingInputs?: string[] | Record<string, unknown>
): AnalyticalResponse<T> {
  const inputs: string[] = [];
  if (Array.isArray(missingInputs)) {
    inputs.push(...missingInputs);
  } else if (missingInputs && typeof missingInputs === 'object') {
    for (const [k, v] of Object.entries(missingInputs)) {
      inputs.push(v ? k : k); // include key name
    }
  }

  return buildAnalyticalResponse<T>({
    status: 'unavailable',
    mode: 'production_unavailable',
    reason,
    message,
    dataState: buildDataState({
      availability: 'unavailable',
      freshness: 'unknown',
      missingInputs: inputs,
    }),
  });
}

/**
 * Create a partial response.
 */
export function partialResponse<T>(
  reason: string,
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
 * Accepts DataFreshnessResult OR plain DataFreshness string for convenience.
 */
export function realResponse<T>(
  data: T,
  freshness: DataFreshness | DataFreshnessResult,
  asOf: string | null,
  completenessScore: number,
  lineage: DataLineageEntry[],
  reason?: string,
  neutralizedFields?: string[]
): AnalyticalResponse<T> {
  const fresh: DataFreshness =
    typeof freshness === 'string' ? freshness : freshness.freshness;
  const effectiveAsOf: string | null =
    typeof freshness === 'string' ? asOf : (freshness.asOf ?? asOf);

  return buildAnalyticalResponse<T>({
    status: 'ok',
    mode: 'production_real',
    reason: reason ?? 'OK',
    data,
    message: null,
    dataState: buildDataState({
      availability: 'available',
      freshness: fresh,
      asOf: effectiveAsOf,
      completenessScore,
      lineage,
      neutralizedFields: neutralizedFields ?? [],
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
  reason: string,
  message: string,
  freshness?: DataFreshness | DataFreshnessResult,
  asOf?: string | null,
  lineage?: DataLineageEntry[]
): AnalyticalResponse<T> {
  const fresh: DataFreshness =
    typeof freshness === 'string' ? freshness : (freshness?.freshness ?? 'unknown');
  const effectiveAsOf: string | null =
    typeof freshness === 'string' ? (asOf ?? null) : (freshness?.asOf ?? asOf ?? null);

  return buildAnalyticalResponse<T>({
    status: 'empty',
    mode: 'production_real',
    reason,
    message,
    dataState: buildDataState({
      availability: 'available',
      freshness: fresh,
      asOf: effectiveAsOf,
      lineage: lineage ?? [],
    }),
  });
}

/**
 * Create an error response.
 */
export function errorResponse<T>(
  reason: string,
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
