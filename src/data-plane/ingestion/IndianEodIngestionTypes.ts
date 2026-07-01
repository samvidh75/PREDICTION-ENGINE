// ─────────────────────────────────────────────────────────────────────────────
// Phase 21A — EOD ingestion contracts
//
// Types for the EOD ingestion pipeline: source kinds, batch descriptors,
// ingestion results, and task records.
// ─────────────────────────────────────────────────────────────────────────────

// ---------------------------------------------------------------------------
// Source kind
// ---------------------------------------------------------------------------

/** Recognised EOD data sources (public, legal, server-side). */
export type EodIngestionSourceKind =
  | 'bse_bhavcopy'       // BSE daily bhavcopy CSV
  | 'nse_bhavcopy'       // NSE daily bhavcopy CSV
  | 'nse_trading_symbols'// NSE trading symbol list
  | 'provider_api';      // Generic provider API (for future use)

// ---------------------------------------------------------------------------
// Batch
// ---------------------------------------------------------------------------

/**
 * Descriptor for an EOD ingestion batch — a set of candles from a single
 * source for a single trading date.
 */
export interface EodIngestionBatch {
  /** Unique batch ID (uuid). */
  readonly batchId: string;

  /** Source of this batch. */
  readonly source: EodIngestionSourceKind;

  /** Trading date these candles belong to. */
  readonly tradeDate: string;

  /** Number of candles in the batch. */
  readonly count: number;

  /** Timestamp (ISO string) when this batch was created. */
  readonly createdAt: string;

  /** Human-readable label for logging/audit. */
  readonly label: string;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface EodIngestionResult {
  /** Batch descriptor. */
  readonly batch: EodIngestionBatch;

  /** Candles that passed validation and were stored. */
  readonly accepted: number;

  /** Candles that failed validation. */
  readonly rejected: number;

  /** Candles that were duplicates of already-stored data. */
  readonly duplicates: number;

  /** Total duration in milliseconds. */
  readonly durationMs: number;

  /** List of rejection reasons (sampled — first 50). */
  readonly sampleRejections: string[];
}

// ---------------------------------------------------------------------------
// Task record
// ---------------------------------------------------------------------------

/** Record stored in the `ingestion_log` table for audit. */
export interface IngestionTaskRecord {
  /** Unique task ID (uuid). */
  taskId: string;

  /** Source kind. */
  source: EodIngestionSourceKind;

  /** Trade date being ingested. */
  tradeDate: string;

  /** Start time (ISO string). */
  startedAt: string;

  /** End time (ISO string). */
  completedAt: string | null;

  /** Outcome status. */
  status: 'running' | 'completed' | 'failed';

  /** Candles accepted. */
  accepted: number;

  /** Candles rejected. */
  rejected: number;

  /** Error message if failed. */
  error: string | null;
}
