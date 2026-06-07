/**
 * TRACK-60 AGENT B — Pipeline Recovery Service
 * 
 * Resume interrupted pipeline runs, detect stuck jobs, safe retry, idempotent.
 * Works with DailyPipelineScheduler's lock file + pipeline_health table.
 */
import fs from 'fs';
import path from 'path';
import pool from '../db/index';

const LOCK_FILE = path.join(process.cwd(), 'data', '.pipeline_lock');
const STUCK_THRESHOLD_MS = 3600000; // 1 hour — if lock older than this, pipeline is stuck

export interface RecoveryStatus {
  isRunning: boolean;
  isStuck: boolean;
  lastRunId: string | null;
  lastRunStatus: string | null;
  lastRunTime: string | null;
  failedPhases: string[];
  recovered: boolean;
}

export class PipelineRecoveryService {
  /**
   * Check pipeline health and recover if stuck.
   */
  async diagnose(): Promise<RecoveryStatus> {
    const result: RecoveryStatus = {
      isRunning: false,
      isStuck: false,
      lastRunId: null,
      lastRunStatus: null,
      lastRunTime: null,
      failedPhases: [],
      recovered: false,
    };

    // Check lock file
    if (fs.existsSync(LOCK_FILE)) {
      const age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs;
      result.isRunning = true;
      if (age > STUCK_THRESHOLD_MS) {
        result.isStuck = true;
      }
    }

    // Check pipeline_health for recent runs
    try {
      const recentRuns = await pool.query(
        `SELECT phase, status, completed_at FROM pipeline_health
         ORDER BY created_at DESC LIMIT 20`
      );

      for (const row of recentRuns.rows) {
        if (row.status === 'running' && !row.completed_at) {
          result.failedPhases.push(row.phase);
        }
        if (!result.lastRunId) {
          result.lastRunId = row.phase?.split(':')[0] || null;
          result.lastRunStatus = row.status;
          result.lastRunTime = row.completed_at || null;
        }
      }
    } catch {
      // pipeline_health table may not exist yet
    }

    return result;
  }

  /**
   * Recover a stuck pipeline by releasing the lock.
   * Only call after confirming the pipeline is truly stuck (not just slow).
   */
  async recover(): Promise<{ success: boolean; reason: string }> {
    const status = await this.diagnose();

    if (!status.isStuck) {
      return { success: false, reason: 'Pipeline not stuck — no recovery needed' };
    }

    // Release stale lock
    try {
      fs.unlinkSync(LOCK_FILE);
    } catch {}

    // Mark any 'running' phases as 'interrupted'
    try {
      await pool.query(
        `UPDATE pipeline_health SET status = 'interrupted', completed_at = NOW()
         WHERE status = 'running' AND completed_at IS NULL`
      );
    } catch {}

    return { success: true, reason: `Stale lock released. ${status.failedPhases.length} phases marked as interrupted.` };
  }

  /**
   * Check if it's safe to start a new pipeline run.
   */
  async canStartNewRun(): Promise<{ safe: boolean; reason: string }> {
    const status = await this.diagnose();

    if (status.isRunning && !status.isStuck) {
      return { safe: false, reason: 'Pipeline currently running' };
    }

    if (status.isStuck) {
      return { safe: false, reason: 'Pipeline stuck — call recover() first' };
    }

    if (status.failedPhases.length > 3) {
      return { safe: false, reason: `${status.failedPhases.length} failed phases from last run — investigate before restarting` };
    }

    return { safe: true, reason: 'Ready for new pipeline run' };
  }

  /**
   * Get the full pipeline health report for the last 7 days.
   */
  async getHealthReport(): Promise<{
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    stuckRuns: number;
    lastSuccessfulRun: string | null;
    recommendations: string[];
  }> {
    let totalRuns = 0;
    let successfulRuns = 0;
    let failedRuns = 0;
    let stuckRuns = 0;
    let lastSuccessfulRun: string | null = null;
    const recommendations: string[] = [];

    try {
      const runs = await pool.query(
        `SELECT DISTINCT phase, status, completed_at FROM pipeline_health
         ORDER BY created_at DESC LIMIT 100`
      );

      const runIds = new Set<string>();
      for (const row of runs.rows) {
        const runId = row.phase?.split(':')[0];
        if (runId) runIds.add(runId);
      }

      totalRuns = runIds.size;

      // Count statuses
      for (const row of runs.rows) {
        if (row.status === 'success') successfulRuns++;
        if (row.status === 'failed' || row.status === 'interrupted') failedRuns++;
        if (row.status === 'running' && !row.completed_at) stuckRuns++;
        if (row.status === 'success' && !lastSuccessfulRun) {
          lastSuccessfulRun = row.completed_at;
        }
      }
    } catch {
      // Table may not exist
    }

    if (failedRuns > successfulRuns) {
      recommendations.push('Failure rate exceeds success rate — investigate pipeline logs');
    }
    if (stuckRuns > 0) {
      recommendations.push(`${stuckRuns} stuck runs detected — run recovery`);
    }
    if (totalRuns === 0) {
      recommendations.push('No pipeline runs recorded — start the scheduler');
    }

    return { totalRuns, successfulRuns, failedRuns, stuckRuns, lastSuccessfulRun, recommendations };
  }
}

export const recoveryService = new PipelineRecoveryService();
export default PipelineRecoveryService;
