/**
 * JobRunReporter
 *
 * Reports job run results to DB and optionally to console.
 * Integrates with IntelligenceLogger for structured output.
 */

import type { JobRunRecord } from '../jobs/JobRunner';
import type { JobResult } from '../ingestion/IngestionTypes';
import { IntelligenceLogger } from './IntelligenceLogger';

export interface PersistedJobRun {
  id?: number;
  job_name: string;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  status: string;
  symbols_processed: number;
  success_count: number;
  failure_count: number;
  error_summary: string | null;
}

export class JobRunReporter {
  private logger: IntelligenceLogger;
  private db: {
    insertRun(run: PersistedJobRun): Promise<void>;
    getRecentRuns(jobName: string, limit: number): Promise<PersistedJobRun[]>;
  } | null = null;

  constructor(logger: IntelligenceLogger, db?: { insertRun(run: PersistedJobRun): Promise<void>; getRecentRuns(jobName: string, limit: number): Promise<PersistedJobRun[]> }) {
    this.logger = logger;
    this.db = db ?? null;
  }

  async report(result: JobResult): Promise<void> {
    this.logger.info(`Job "${result.jobName}" completed`, {
      durationMs: result.durationMs,
      symbolsProcessed: result.symbolsProcessed,
      successCount: result.successCount,
      failureCount: result.failureCount,
      errors: result.errors.length,
    });

    if (!this.db) return;

    const record: PersistedJobRun = {
      job_name: result.jobName,
      started_at: result.startedAt,
      ended_at: result.endedAt,
      duration_ms: result.durationMs,
      status: result.errors.length === 0 ? 'success' : result.successCount > 0 ? 'partial' : 'failure',
      symbols_processed: result.symbolsProcessed,
      success_count: result.successCount,
      failure_count: result.failureCount,
      error_summary: result.errors.length > 0
        ? result.errors.slice(0, 3).join('; ') + (result.errors.length > 3 ? ` (+${result.errors.length - 3})` : '')
        : null,
    };

    await this.db.insertRun(record).catch((err) => {
      this.logger.error('Failed to persist job run record', { error: String(err) });
    });
  }

  async getRecentSummary(jobName: string, limit = 10): Promise<PersistedJobRun[]> {
    if (!this.db) return [];
    return this.db.getRecentRuns(jobName, limit);
  }
}
