/**
 * CheckpointManager — TRACK-21 Phase 5 Task 14
 *
 * Enables pipeline recovery from crashes via persistent checkpointing.
 *
 * Capabilities:
 *   - Resume from last completed symbol
 *   - Retry failed symbols (up to 3 attempts)
 *   - Partial recovery (continue from where it stopped)
 *   - Crash recovery (checkpoint persisted to disk after each symbol)
 *
 * Checkpoint stored as JSON on disk. On restart, loads checkpoint,
 * skips completed symbols, retries failed ones.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FailedEntry {
  symbol: string;
  reason: string;
  retryCount: number;
  stage: string;  // Which stage failed: 'financials' | 'prices' | 'features' | 'factors'
}

export interface Checkpoint {
  runId: string;
  startedAt: string;
  lastUpdatedAt: string;
  totalSymbols: number;
  completedCount: number;
  failedCount: number;
  skippedCount: number;
  completed: string[];
  failed: FailedEntry[];
  skipped: string[];
  currentBatch: number;
  currentStage: string;
  currentSymbol: string | null;
  circuitBreakerStates: Record<string, string>;
  providerSummary: Record<string, { attempted: number; succeeded: number; failed: number }>;
  stageMetrics: Record<string, { started: number; completed: number; failed: number }>;
  performance: {
    avgTimePerSymbolMs: number;
    estimatedRemainingMs: number;
  };
}

const CHECKPOINT_DIR = path.join(process.cwd(), 'data', 'checkpoints');
const MAX_RETRIES = 3;
const MAX_CHECKPOINT_AGE_DAYS = 7;

export class CheckpointManager {
  private checkpoint: Checkpoint;
  private filePath: string;

  constructor(runId: string) {
    if (!fs.existsSync(CHECKPOINT_DIR)) {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }
    this.filePath = path.join(CHECKPOINT_DIR, `nightly-${runId.split('T')[0]}.json`);
    this.checkpoint = this.load() ?? this.createNew(runId);
  }

  // ── Lifecycle ─────────────────────────────────────────

  /** Check if a symbol was already completed in this run. */
  isCompleted(symbol: string): boolean {
    return this.checkpoint.completed.includes(symbol);
  }

  /** Check if a symbol has failed and still has retries remaining. */
  canRetry(symbol: string): boolean {
    const entry = this.checkpoint.failed.find(f => f.symbol === symbol);
    return entry ? entry.retryCount < MAX_RETRIES : false;
  }

  /** Check if a symbol was skipped. */
  isSkipped(symbol: string): boolean {
    return this.checkpoint.skipped.includes(symbol);
  }

  /** Mark a symbol as successfully completed. */
  markCompleted(symbol: string): void {
    // Remove from failed if it was previously there (retry succeeded)
    this.checkpoint.failed = this.checkpoint.failed.filter(f => f.symbol !== symbol);

    if (!this.checkpoint.completed.includes(symbol)) {
      this.checkpoint.completed.push(symbol);
      this.checkpoint.completedCount = this.checkpoint.completed.length;
      this.checkpoint.lastUpdatedAt = new Date().toISOString();
      this.checkpoint.currentSymbol = symbol;
      this.persist();
    }
  }

  /** Mark a symbol as failed. */
  markFailed(symbol: string, reason: string, stage: string): void {
    const existing = this.checkpoint.failed.find(f => f.symbol === symbol);
    if (existing) {
      existing.retryCount++;
      existing.reason = reason;
      existing.stage = stage;
    } else {
      this.checkpoint.failed.push({ symbol, reason, retryCount: 1, stage });
    }
    this.checkpoint.failedCount = this.checkpoint.failed.length;
    this.checkpoint.lastUpdatedAt = new Date().toISOString();
    this.checkpoint.currentSymbol = symbol;
    this.persist();
  }

  /** Mark a symbol as skipped (e.g., already in DB, no data available). */
  markSkipped(symbol: string): void {
    if (!this.checkpoint.skipped.includes(symbol)) {
      this.checkpoint.skipped.push(symbol);
      this.checkpoint.skippedCount = this.checkpoint.skipped.length;
      this.persist();
    }
  }

  /** Update current batch index. */
  setCurrentBatch(batch: number): void {
    this.checkpoint.currentBatch = batch;
    this.persist();
  }

  /** Update current pipeline stage. */
  setCurrentStage(stage: string): void {
    this.checkpoint.currentStage = stage;
    // Initialize stage metrics if needed
    if (!this.checkpoint.stageMetrics[stage]) {
      this.checkpoint.stageMetrics[stage] = { started: 0, completed: 0, failed: 0 };
    }
    this.persist();
  }

  /** Record a stage-level completion. */
  recordStageCompletion(stage: string, succeeded: boolean): void {
    if (!this.checkpoint.stageMetrics[stage]) {
      this.checkpoint.stageMetrics[stage] = { started: 0, completed: 0, failed: 0 };
    }
    this.checkpoint.stageMetrics[stage].started++;
    if (succeeded) {
      this.checkpoint.stageMetrics[stage].completed++;
    } else {
      this.checkpoint.stageMetrics[stage].failed++;
    }
  }

  /** Update circuit breaker states. */
  updateCircuitBreakerStates(states: Record<string, string>): void {
    this.checkpoint.circuitBreakerStates = states;
    this.persist();
  }

  /** Update provider summary stats. */
  updateProviderSummary(summary: Record<string, { attempted: number; succeeded: number; failed: number }>): void {
    this.checkpoint.providerSummary = summary;
    this.persist();
  }

  /** Update performance estimates. */
  updatePerformance(avgTimeMs: number, remaining: number): void {
    this.checkpoint.performance = {
      avgTimePerSymbolMs: Math.round(avgTimeMs),
      estimatedRemainingMs: Math.round(remaining),
    };
    this.persist();
  }

  /** Get symbols that haven't been processed yet (not completed, not failed, not skipped). */
  getRemainingSymbols(allSymbols: string[]): string[] {
    const completedSet = new Set(this.checkpoint.completed);
    const failedSet = new Set(this.checkpoint.failed.map(f => f.symbol));
    const skippedSet = new Set(this.checkpoint.skipped);
    return allSymbols.filter(s => !completedSet.has(s) && !failedSet.has(s) && !skippedSet.has(s));
  }

  /** Get symbols that failed but can be retried. */
  getRetryableSymbols(): FailedEntry[] {
    return this.checkpoint.failed.filter(f => f.retryCount < MAX_RETRIES);
  }

  /** Get the checkpoint state for serialization. */
  getCheckpoint(): Checkpoint {
    return { ...this.checkpoint };
  }

  /** Set total symbol count. */
  setTotalSymbols(count: number): void {
    this.checkpoint.totalSymbols = count;
    this.persist();
  }

  /** Archive (delete) the checkpoint after successful completion. */
  archive(): void {
    try {
      const archiveDir = path.join(CHECKPOINT_DIR, 'archive');
      if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
      }
      const archivePath = path.join(archiveDir, `nightly-${this.checkpoint.runId.split('T')[0]}-completed.json`);
      fs.renameSync(this.filePath, archivePath);
    } catch (err: any) {
      console.warn(`CheckpointManager: failed to archive checkpoint — ${err.message}`);
    }
  }

  // ── Private ────────────────────────────────────────────

  private load(): Checkpoint | null {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      const raw = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(raw) as Checkpoint;
    } catch {
      return null;
    }
  }

  private createNew(runId: string): Checkpoint {
    return {
      runId,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
      totalSymbols: 0,
      completedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      completed: [],
      failed: [],
      skipped: [],
      currentBatch: 0,
      currentStage: 'init',
      currentSymbol: null,
      circuitBreakerStates: {},
      providerSummary: {},
      stageMetrics: {},
      performance: {
        avgTimePerSymbolMs: 0,
        estimatedRemainingMs: 0,
      },
    };
  }

  private persist(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.checkpoint, null, 2), 'utf8');
    } catch (err: any) {
      console.error(`CheckpointManager: failed to persist checkpoint — ${err.message}`);
    }
  }

  /**
   * Clean up checkpoints older than MAX_CHECKPOINT_AGE_DAYS.
   */
  static cleanupOldCheckpoints(): void {
    if (!fs.existsSync(CHECKPOINT_DIR)) return;

    const now = Date.now();
    const maxAge = MAX_CHECKPOINT_AGE_DAYS * 24 * 60 * 60 * 1000;

    try {
      const files = fs.readdirSync(CHECKPOINT_DIR);
      for (const file of files) {
        if (file.startsWith('nightly-') && file.endsWith('.json')) {
          const filePath = path.join(CHECKPOINT_DIR, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`CheckpointManager: cleaned up old checkpoint ${file}`);
          }
        }
      }

      // Also cleanup archive
      const archiveDir = path.join(CHECKPOINT_DIR, 'archive');
      if (fs.existsSync(archiveDir)) {
        const archiveFiles = fs.readdirSync(archiveDir);
        for (const file of archiveFiles) {
          const filePath = path.join(archiveDir, file);
          const stats = fs.statSync(filePath);
          if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
          }
        }
      }
    } catch (err: any) {
      console.warn(`CheckpointManager: cleanup failed — ${err.message}`);
    }
  }
}

export default CheckpointManager;
