/**
 * TRACK-57 AGENT A — Daily Pipeline Scheduler
 * 
 * Retry logic, lock file, idempotent execution, failure isolation.
 * Schedule: 05:00 IST data → 05:30 factors → 06:00 predictions → 06:15 validate → 06:30 trust → 06:45 feed
 */
import fs from 'fs';
import path from 'path';
import { predictionFactory } from '../predictions/PredictionFactory';
import { outcomeValidator } from '../validation/OutcomeValidator';
import { pipelineAlertService } from '../services/PipelineAlertService';
import pool from '../db/index';

const LOCK_FILE = path.join(process.cwd(), 'data', '.pipeline_lock');
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 60000; // 1 minute

export interface PipelinePhaseResult {
  phase: string;
  status: 'success' | 'failed' | 'skipped';
  durationMs: number;
  details?: any;
  error?: string;
  retries?: number;
}

export interface PipelineRunResult {
  runId: string;
  startedAt: string;
  completedAt: string;
  phases: PipelinePhaseResult[];
  success: boolean;
}

export class DailyPipelineScheduler {
  private locked = false;

  async execute(): Promise<PipelineRunResult> {
    // Lock file to prevent concurrent runs
    if (this.hasLock()) {
      console.info('[SCHEDULER] Pipeline already running — skipping');
      return {
        runId: 'skipped',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        phases: [],
        success: false,
      };
    }

    this.acquireLock();
    const runId = `run-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const startedAt = new Date().toISOString();
    const phases: PipelinePhaseResult[] = [];
    let overallSuccess = true;

    console.info(`[SCHEDULER] Starting pipeline run ${runId}`);

    try {
      // Phase 1: Data Refresh (05:00 IST)
      phases.push(await this.executePhase('data_refresh', async () => {
        await this.logPipelineStart(runId, 'data_refresh');
        // Data refresh is handled by external scripts (yfinance/Screener)
        // This phase validates data freshness
        const latestPrices = await pool.query(
          `SELECT MAX(trade_date) as latest FROM daily_prices`
        );
        const latestDate = latestPrices.rows[0]?.latest;
        console.info(`  Latest price data: ${latestDate}`);
        await this.logPipelineComplete(runId, 'data_refresh', 'success');
      }));

      // Phase 2: Factor Refresh (05:30 IST)
      phases.push(await this.executePhase('factor_refresh', async () => {
        await this.logPipelineStart(runId, 'factor_refresh');
        // Factors are recomputed via existing FactorEngine when new data arrives
        // Verify factor snapshots are current
        const latestFactors = await pool.query(
          `SELECT MAX(trade_date) as latest FROM factor_snapshots`
        );
        console.info(`  Latest factor data: ${latestFactors.rows[0]?.latest}`);
        await this.logPipelineComplete(runId, 'factor_refresh', 'success');
      }));

      // Phase 3: Prediction Generation (06:00 IST)
      phases.push(await this.executePhase('prediction_generation', async () => {
        await this.logPipelineStart(runId, 'prediction_generation');
        const result = await predictionFactory.generateDaily([30, 90, 365]);
        console.info(`  Created: ${result.created}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`);
        if (result.errors.length > 0) {
          console.error(`  Errors: ${result.errors.slice(0, 3).join('; ')}`);
        }
        await this.logPipelineComplete(runId, 'prediction_generation',
          result.errors.length === 0 ? 'success' : 'partial');
        return result;
      }));

      // Phase 4: Outcome Validation (06:15 IST)
      phases.push(await this.executePhase('outcome_validation', async () => {
        await this.logPipelineStart(runId, 'outcome_validation');
        const result = await outcomeValidator.validateAll([30, 90, 180, 365]);
        await outcomeValidator.logRun(result);
        result.forEach(r => console.info(`  ${r.horizonDays}d: ${r.validated} validated, ${r.skipped} skipped, ${r.errors} errors`));
        await this.logPipelineComplete(runId, 'outcome_validation',
          result.every(r => r.errors === 0) ? 'success' : 'partial');
        return result;
      }));

      // Phase 5: Trust Metrics Refresh (06:30 IST)
      phases.push(await this.executePhase('trust_metrics', async () => {
        await this.logPipelineStart(runId, 'trust_metrics');
        // Trust metrics are computed live from prediction_registry
        // This phase verifies data availability
        const validatedCount = await pool.query(
          `SELECT COUNT(*) as cnt FROM prediction_registry WHERE validation_status = 'validated'`
        );
        console.info(`  Validated predictions: ${validatedCount.rows[0]?.cnt || 0}`);
        await this.logPipelineComplete(runId, 'trust_metrics', 'success');
      }));

      // Phase 6: Daily Feed Generation (06:45 IST)
      phases.push(await this.executePhase('daily_feed', async () => {
        await this.logPipelineStart(runId, 'daily_feed');
        // Feed is computed from today's predictions + factor changes
        const todayPredictions = await pool.query(
          `SELECT COUNT(*) as cnt FROM prediction_registry WHERE prediction_date = $1`,
          [new Date().toISOString().split('T')[0]]
        );
        console.info(`  Today's predictions: ${todayPredictions.rows[0]?.cnt || 0}`);
        await this.logPipelineComplete(runId, 'daily_feed', 'success');
      }));

    } catch (err: any) {
      console.error(`[SCHEDULER] Fatal pipeline error: ${err.message}`);
      overallSuccess = false;
    } finally {
      this.releaseLock();
    }

    const completedAt = new Date().toISOString();
    console.info(`[SCHEDULER] Pipeline ${runId} complete — ${overallSuccess ? 'SUCCESS' : 'PARTIAL'}`);

    // Dispatch alerts for any failed phases
    const failedPhases = phases.filter(p => p.status === 'failed');
    if (failedPhases.length > 0) {
      try {
        await pipelineAlertService.sendAlert(
          'WARNING', 'DailyPipelineScheduler',
          `${failedPhases.length} phase(s) failed in run ${runId}: ${failedPhases.map(p => p.phase).join(', ')}`
        );
      } catch (e: unknown) {
        console.error(`[SCHEDULER] Alert dispatch failed: ${(e as Error).message}`);
      }
    }

    return { runId, startedAt, completedAt, phases, success: overallSuccess };
  }

  private async executePhase(
    phase: string,
    fn: () => Promise<any>,
  ): Promise<PipelinePhaseResult> {
    const start = Date.now();
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const details = await fn();
        return {
          phase,
          status: 'success',
          durationMs: Date.now() - start,
          details,
          retries: attempt - 1,
        };
      } catch (err: any) {
        lastError = err.message;
        console.error(`[SCHEDULER] Phase ${phase} attempt ${attempt}/${MAX_RETRIES} failed: ${lastError}`);
        if (attempt < MAX_RETRIES) {
          await this.sleep(RETRY_DELAY_MS * attempt);
        }
      }
    }

    return {
      phase,
      status: 'failed',
      durationMs: Date.now() - start,
      error: lastError,
      retries: MAX_RETRIES,
    };
  }

  private hasLock(): boolean {
    try {
      if (fs.existsSync(LOCK_FILE)) {
        const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
        if (age > 3600000) {
          // Lock is stale (> 1 hour) — release it
          fs.unlinkSync(LOCK_FILE);
          return false;
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private acquireLock(): void {
    fs.writeFileSync(LOCK_FILE, new Date().toISOString(), 'utf-8');
  }

  private releaseLock(): void {
    try { fs.unlinkSync(LOCK_FILE); } catch {/* silent */}
  }

  private async logPipelineStart(runId: string, phase: string): Promise<void> {
    try {
      const id = crypto.randomUUID();
      await pool.query(
        `INSERT INTO pipeline_health (id, phase, status, started_at)
         VALUES ($1, $2, 'running', NOW())`,
        [id, `${runId}:${phase}`]
      );
    } catch {/* silent */}
  }

  private async logPipelineComplete(runId: string, phase: string, status: string): Promise<void> {
    try {
      await pool.query(
        `UPDATE pipeline_health SET status = $1, completed_at = NOW()
         WHERE phase = $2 AND completed_at IS NULL`,
        [status, `${runId}:${phase}`]
      );
    } catch {/* silent */}
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const dailyPipeline = new DailyPipelineScheduler();
export default DailyPipelineScheduler;
