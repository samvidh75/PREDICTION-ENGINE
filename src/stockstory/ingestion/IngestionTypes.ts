/**
 * Shared types for ingestion modules
 */

export interface IngestionSource {
  name: string;
  available: boolean;
  priority: number; // lower = preferred
}

export interface JobOptions {
  symbols?: string[];           // specific symbols
  limit?: number;               // max symbols to process
  dryRun?: boolean;             // no writes
  changedOnly?: boolean;        // skip unchanged inputs
  cursor?: string;              // resumable cursor
  concurrency?: number;         // parallel limit
}

export interface JobResult {
  success: boolean;
  jobName: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  symbolsProcessed: number;
  successCount: number;
  failureCount: number;
  errors: string[];
  /** Cursor for resumable jobs */
  nextCursor?: string;
}

export interface IngestionJob {
  readonly name: string;
  run(options: JobOptions): Promise<JobResult>;
}

/** Sanitize a value for DB insertion — reject NaN/Infinity/null/undefined */
export function safeDbValue(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return n;
}
