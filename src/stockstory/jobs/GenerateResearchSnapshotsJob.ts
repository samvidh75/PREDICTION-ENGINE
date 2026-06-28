/**
 * Generate Research Snapshots Job
 *
 * Generates cached research output for symbols using the intelligence
 * engine orchestrator. Cache-first — uses input hashes to skip
 * unchanged inputs. Batch-safe and resumable.
 * If LLM unavailable, deterministic fallback must generate output.
 */

import type { JobOptions, JobResult, IngestionJob } from '../ingestion/IngestionTypes';
import type { StockIntelligenceReport } from '../intelligence/types';

export interface OrchestratorBridge {
  analyze(symbol: string): Promise<StockIntelligenceReport>;
  /** Input hash for cache invalidation */
  inputHash(symbol: string): Promise<string | null>;
}

export interface ResearchSnapshotStore {
  exists(symbol: string, inputHash: string): Promise<boolean>;
  save(symbol: string, inputHash: string, report: StockIntelligenceReport): Promise<void>;
  getSymbols(): Promise<string[]>;
}

export class GenerateResearchSnapshotsJob implements IngestionJob {
  readonly name = 'generate-research';

  private orchestrator: OrchestratorBridge;
  private store: ResearchSnapshotStore;

  constructor(orchestrator: OrchestratorBridge, store: ResearchSnapshotStore) {
    this.orchestrator = orchestrator;
    this.store = store;
  }

  async run(options: JobOptions): Promise<JobResult> {
    const startedAt = new Date().toISOString();
    const errors: string[] = [];
    let successCount = 0;
    let failureCount = 0;

    let symbols: string[];

    if (options.symbols && options.symbols.length > 0) {
      symbols = options.symbols;
    } else {
      symbols = await this.store.getSymbols();
    }

    if (options.limit && options.limit > 0) {
      symbols = symbols.slice(0, options.limit);
    }

    for (const symbol of symbols) {
      try {
        if (options.changedOnly) {
          const hash = await this.orchestrator.inputHash(symbol);
          if (hash && (await this.store.exists(symbol, hash))) {
            successCount++; // unchanged, skip
            continue;
          }
        }

        if (!options.dryRun) {
          const report = await this.orchestrator.analyze(symbol);
          const hash = await this.orchestrator.inputHash(symbol);
          await this.store.save(symbol, hash ?? '', report);
        }
        successCount++;
      } catch (err) {
        failureCount++;
        errors.push(`${symbol}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const endedAt = new Date().toISOString();
    return {
      success: errors.length === 0,
      jobName: this.name,
      startedAt,
      endedAt,
      durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
      symbolsProcessed: symbols.length,
      successCount,
      failureCount,
      errors,
    };
  }
}
