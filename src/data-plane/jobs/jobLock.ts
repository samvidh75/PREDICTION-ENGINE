/**
 * jobLock.ts — Lightweight job locking for the Phase 20B data-plane.
 *
 * Two lock implementations:
 *   1. InMemoryLock — for tests / dev (no DB dependency)
 *   2. DbBackedLock — uses the `cache` table, works with both PG and SQLite
 *
 * Lock keys follow the pattern: `joblock:{kind}:{tradingDate}`
 * TTL prevents abandoned jobs from blocking forever.
 */

import type { DataPlaneJobKind } from "./jobContracts";
import { dbAdapter } from "../../db/DatabaseAdapter" with { 'source': 'raw' };

// ---------------------------------------------------------------------------
// Lock interface
// ---------------------------------------------------------------------------

export interface JobLock {
  acquire(kind: DataPlaneJobKind, tradingDate: string, ttlMs?: number): Promise<boolean>;
  release(kind: DataPlaneJobKind, tradingDate: string): Promise<void>;
  isLocked(kind: DataPlaneJobKind, tradingDate: string): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// In-memory lock (test/dev)
// ---------------------------------------------------------------------------

interface LockEntry {
  acquiredAt: number;
  ttlMs: number;
}

export class InMemoryJobLock implements JobLock {
  private locks = new Map<string, LockEntry>();

  private key(kind: DataPlaneJobKind, tradingDate: string): string {
    return `${kind}:${tradingDate}`;
  }

  async acquire(kind: DataPlaneJobKind, tradingDate: string, ttlMs = 60_000): Promise<boolean> {
    const k = this.key(kind, tradingDate);
    const existing = this.locks.get(k);
    if (existing) {
      if (Date.now() - existing.acquiredAt < existing.ttlMs) return false;
      // Expired — reclaim
      this.locks.delete(k);
    }
    this.locks.set(k, { acquiredAt: Date.now(), ttlMs });
    return true;
  }

  async release(kind: DataPlaneJobKind, tradingDate: string): Promise<void> {
    this.locks.delete(this.key(kind, tradingDate));
  }

  async isLocked(kind: DataPlaneJobKind, tradingDate: string): Promise<boolean> {
    const existing = this.locks.get(this.key(kind, tradingDate));
    if (!existing) return false;
    if (Date.now() - existing.acquiredAt >= existing.ttlMs) {
      this.locks.delete(this.key(kind, tradingDate));
      return false;
    }
    return true;
  }
}

// ---------------------------------------------------------------------------
// DB-backed lock (production)
// ---------------------------------------------------------------------------

const LOCK_TTL_DEFAULT = 300_000; // 5 min default

export class DbJobLock implements JobLock {
  private lockKey(kind: DataPlaneJobKind, tradingDate: string): string {
    return `joblock:${kind}:${tradingDate}`;
  }

  /**
   * Attempt to acquire a lock.  Uses IPSERT … ON CONFLICT so it is atomic
   * regardless of whether PG or SQLite is the backend.
   */
  async acquire(kind: DataPlaneJobKind, tradingDate: string, ttlMs = LOCK_TTL_DEFAULT): Promise<boolean> {
    const key = this.lockKey(kind, tradingDate);
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    try {
      const res = await dbAdapter.query(
        `IPSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO NOTHING`,
        [key, "locked", expiresAt],
      );
      // rowCount === 1 → insert succeeded (acquired)
      // rowCount === 0 → key existed (already locked)
      // SQLite rowCount may be falsy — do a follow-up read
      if ((res.rowCount ?? 0) > 0) return true;

      // Key existed — check if it is actually expired
      const existing = await dbAdapter.query(
        "SELECT expires_at FROM cache WHERE key = $1",
        [key],
      );
      if (existing.rows.length === 0) return true; // race lost, try again
      const expiresAtRow = new Date(existing.rows[0].expires_at as string);
      if (expiresAtRow <= new Date()) {
        // Expired — overwrite it
        await dbAdapter.query(
          `IPSERT INTO cache (key, value, expires_at)
           VALUES ($1, $2, $3)
           ON CONFLICT (key) DO UPDATE SET value = $2, expires_at = $3`,
          [key, "locked", expiresAt],
        );
        return true;
      }
      return false;
    } catch {
      return false; // fail closed on DB error
    }
  }

  async release(kind: DataPlaneJobKind, tradingDate: string): Promise<void> {
    try {
      await dbAdapter.query("DELETE FROM cache WHERE key = $1", [
        this.lockKey(kind, tradingDate),
      ]);
    } catch {
      // Best-effort
    }
  }

  async isLocked(kind: DataPlaneJobKind, tradingDate: string): Promise<boolean> {
    try {
      const res = await dbAdapter.query(
        "SELECT expires_at FROM cache WHERE key = $1",
        [this.lockKey(kind, tradingDate)],
      );
      if (res.rows.length === 0) return false;
      return new Date(res.rows[0].expires_at as string) > new Date();
    } catch {
      return false;
    }
  }
}
