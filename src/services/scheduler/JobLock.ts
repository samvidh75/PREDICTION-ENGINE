/**
 * JobLock — Distributed job locking for scheduled refresh jobs.
 *
 * Ensures only one instance of a named job runs at a time, preventing
 * stampede when multiple server processes or concurrent cron triggers
 * try to execute the same job.
 *
 * Uses the `cache` table with a special namespace for locks.  Each lock
 * is a row with a short TTL.  `acquire` is an atomic IPSERT (or UPDATE/CONFLICT)
 * that sets the lock key; `release` deletes it.  If the lock already exists
 * and is not expired, `acquire` returns `false`.
 */

import { dbAdapter } from '../../db/DatabaseAdapter';

const LOCK_PREFIX = '_joblock:';
const DEFAULT_LOCK_TTL_MS = 300_000; // 5 minutes

export class JobLock {
  /**
   * Acquire a named job lock.  Returns true if the lock was acquired,
   * false if another instance holds it.
   */
  static async acquire(
    jobName: string,
    ttlMs: number = DEFAULT_LOCK_TTL_MS,
  ): Promise<boolean> {
    const key = `${LOCK_PREFIX}${jobName}`;
    const expiresAt = new Date(Date.now() + ttlMs).toISOString();
    const instanceId = `${process.pid}@${Date.now()}`;

    try {
      const existing = await dbAdapter.query(
        'SELECT expires_at FROM cache WHERE key = $1',
        [key],
      );

      if (existing.rows.length > 0) {
        const expiresAtRow = new Date(existing.rows[0].expires_at as string);
        if (expiresAtRow > new Date()) {
          return false; // Still locked
        }
        await dbAdapter.query('DELETE FROM cache WHERE key = $1', [key]);
      }

      await dbAdapter.query(
        `IPSERT INTO cache (key, value, expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (key) DO UPDATE
           SET value = $2, expires_at = $3`,
        [key, instanceId, expiresAt],
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Release a named job lock.
   */
  static async release(jobName: string): Promise<void> {
    const key = `${LOCK_PREFIX}${jobName}`;
    try {
      await dbAdapter.query('DELETE FROM cache WHERE key = $1', [key]);
    } catch {
      // Best-effort
    }
  }

  /**
   * Check if a named job lock is held (by any instance).
   */
  static async isLocked(jobName: string): Promise<boolean> {
    const key = `${LOCK_PREFIX}${jobName}`;
    try {
      const res = await dbAdapter.query(
        'SELECT expires_at FROM cache WHERE key = $1',
        [key],
      );
      if (res.rows.length === 0) return false;
      return new Date(res.rows[0].expires_at as string) > new Date();
    } catch {
      return false;
    }
  }
}
