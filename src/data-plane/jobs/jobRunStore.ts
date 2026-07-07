/**
 * jobRunStore.ts — Records job run history for the data-plane jobs.
 *
 * Two implementations:
 *   1. InMemoryJobRunStore — for tests / dev (no DB dependency)
 *   2. DbJobRunStore — stores run records in the `cache` table with TTL
 *
 * The store keeps the last N runs per job kind for diagnostics.
 */

import type { DataPlaneJobKind, DataPlaneJobRun } from "./jobContracts";
import { dbAdapter } from "../../db/DatabaseAdapter" with { 'source': 'raw' };

// ---------------------------------------------------------------------------
// Store interface
// ---------------------------------------------------------------------------

export interface JobRunStore {
  saveRun(run: DataPlaneJobRun): Promise<void>;
  getRecentRuns(kind: DataPlaneJobKind, limit?: number): Promise<DataPlaneJobRun[]>;
  getLastRun(kind: DataPlaneJobKind): Promise<DataPlaneJobRun | null>;
}

// ---------------------------------------------------------------------------
// In-memory store (test/dev)
// ---------------------------------------------------------------------------

export class InMemoryJobRunStore implements JobRunStore {
  private runs = new Map<string, DataPlaneJobRun[]>();

  async saveRun(run: DataPlaneJobRun): Promise<void> {
    const existing = this.runs.get(run.kind) ?? [];
    existing.unshift(run);
    // Keep last 100 runs per kind
    this.runs.set(run.kind, existing.slice(0, 100));
  }

  async getRecentRuns(kind: DataPlaneJobKind, limit = 10): Promise<DataPlaneJobRun[]> {
    return (this.runs.get(kind) ?? []).slice(0, limit);
  }

  async getLastRun(kind: DataPlaneJobKind): Promise<DataPlaneJobRun | null> {
    const runs = this.runs.get(kind);
    return runs?.[0] ?? null;
  }
}

// ---------------------------------------------------------------------------
// DB-backed store (production)
// ---------------------------------------------------------------------------

const RUN_KEY_PREFIX = "dprun:";
const RUN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export class DbJobRunStore implements JobRunStore {
  private runKey(kind: DataPlaneJobKind, id: string): string {
    return `${RUN_KEY_PREFIX}${kind}:${id}`;
  }

  private listKey(kind: DataPlaneJobKind): string {
    return `${RUN_KEY_PREFIX}${kind}:list`;
  }

  async saveRun(run: DataPlaneJobRun): Promise<void> {
    const key = this.runKey(run.kind, run.id);
    const listKey = this.listKey(run.kind);
    const expiresAt = new Date(Date.now() + RUN_TTL_MS).toISOString();
    const value = JSON.stringify(run);

    try {
      // Store individual run
      await dbAdapter.query(
        `IPSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
        [key, value, expiresAt],
      );

      // Maintain a simple list (JSON array of run IDs, newest first)
      const listRes = await dbAdapter.query("SELECT value FROM cache WHERE key = $1", [listKey]);
      let ids: string[] = [];
      if (listRes.rows.length > 0) {
        ids = JSON.parse(listRes.rows[0].value as string) as string[];
      }
      ids = [run.id, ...ids.filter((id) => id !== run.id)].slice(0, 100);
      await dbAdapter.query(
        `IPSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
        [listKey, JSON.stringify(ids), expiresAt],
      );
    } catch {
      // Best-effort — don't block job execution on log failure
    }
  }

  async getRecentRuns(kind: DataPlaneJobKind, limit = 10): Promise<DataPlaneJobRun[]> {
    const listKey = this.listKey(kind);
    try {
      const listRes = await dbAdapter.query("SELECT value FROM cache WHERE key = $1", [listKey]);
      if (listRes.rows.length === 0) return [];
      const ids = (JSON.parse(listRes.rows[0].value as string) as string[]).slice(0, limit);

      const results: DataPlaneJobRun[] = [];
      for (const id of ids) {
        const res = await dbAdapter.query("SELECT value FROM cache WHERE key = $1", [
          this.runKey(kind, id),
        ]);
        if (res.rows.length > 0) {
          try {
            const parsed = JSON.parse(res.rows[0].value as string) as DataPlaneJobRun;
            results.push(parsed);
          } catch {
            // skip malformed
          }
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  async getLastRun(kind: DataPlaneJobKind): Promise<DataPlaneJobRun | null> {
    const recent = await this.getRecentRuns(kind, 1);
    return recent[0] ?? null;
  }
}
