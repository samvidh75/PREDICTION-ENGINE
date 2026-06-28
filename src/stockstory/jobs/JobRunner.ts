/**
 * Job Runner
 *
 * Central job execution engine for all intelligence ingestion/refresh jobs.
 * Safe to run manually, no worker server required.
 * Compatible with Render cron, GitHub Actions, or manual execution.
 * Does not expose secrets in logs.
 */

import type { JobOptions, JobResult } from '../ingestion/IngestionTypes';
import type { IngestionJob } from '../ingestion/IngestionTypes';

export interface JobRunRecord {
  jobName: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  status: 'success' | 'failure' | 'partial';
  symbolsProcessed: number;
  successCount: number;
  failureCount: number;
  errorSummary: string | null;
}

export interface JobRunStore {
  saveRun(record: JobRunRecord): Promise<void>;
  getLastRun(jobName: string): Promise<JobRunRecord | null>;
}

export class JobRunner {
  private registry: Map<string, IngestionJob> = new Map();
  private store: JobRunStore | null = null;

  constructor(store?: JobRunStore) {
    this.store = store ?? null;
  }

  register(job: IngestionJob): void {
    this.registry.set(job.name, job);
  }

  getRegisteredNames(): string[] {
    return Array.from(this.registry.keys());
  }

  async run(jobName: string, options: JobOptions = {}): Promise<JobResult> {
    const job = this.registry.get(jobName);
    if (!job) {
      throw new Error(`Unknown job: "${jobName}". Available: ${this.getRegisteredNames().join(', ')}`);
    }

    // Sanitize options — never log full error details in production
    const safeOptions = { ...options };
    delete (safeOptions as any).cursor; // cursor not relevant for initial log

    const startedAt = new Date();

    try {
      const result = await job.run(options);

      // Record the run
      if (this.store && !options.dryRun) {
        const record: JobRunRecord = {
          jobName,
          startedAt: result.startedAt,
          endedAt: result.endedAt,
          durationMs: result.durationMs,
          status: result.errors.length === 0 ? 'success' : result.successCount > 0 ? 'partial' : 'failure',
          symbolsProcessed: result.symbolsProcessed,
          successCount: result.successCount,
          failureCount: result.failureCount,
          errorSummary: result.errors.length > 0
            ? result.errors.slice(0, 5).join('; ') + (result.errors.length > 5 ? ` (+${result.errors.length - 5} more)` : '')
            : null,
        };
        await this.store.saveRun(record).catch(() => {}); // non-critical
      }

      return result;
    } catch (err) {
      const endedAt = new Date();
      const result: JobResult = {
        success: false,
        jobName,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMs: endedAt.getTime() - startedAt.getTime(),
        symbolsProcessed: 0,
        successCount: 0,
        failureCount: 1,
        errors: [err instanceof Error ? err.message : String(err)],
      };

      if (this.store) {
        await this.store.saveRun({
          jobName,
          startedAt: result.startedAt,
          endedAt: result.endedAt,
          durationMs: result.durationMs,
          status: 'failure',
          symbolsProcessed: 0,
          successCount: 0,
          failureCount: 1,
          errorSummary: err instanceof Error ? err.message.slice(0, 200) : 'Unknown error',
        }).catch(() => {});
      }

      return result;
    }
  }
}
