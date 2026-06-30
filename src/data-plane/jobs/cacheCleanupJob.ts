/**
 * cacheCleanupJob.ts — Job wrapper for purging expired cache entries.
 *
 * Uses EodDataCacheService.cleanupExpired() with a distributed job lock
 * to prevent concurrent cleanup. Safe to run repeatedly.
 */

import { EodDataCacheService } from '../../services/marketData/EodDataCacheService';
import { JobLock } from '../../services/scheduler/JobLock';

export interface CacheCleanupResult {
  deleted: number;
  locked: boolean;
}

/**
 * Run expired cache entry cleanup with job locking.
 *
 * @returns Result with deleted count or lock status
 */
export async function runCacheCleanup(): Promise<CacheCleanupResult> {
  const locked = await JobLock.acquire('cache-cleanup', 120_000);
  if (!locked) {
    return { deleted: 0, locked: false };
  }

  try {
    const deleted = await EodDataCacheService.cleanupExpired();
    return { deleted, locked: true };
  } finally {
    await JobLock.release('cache-cleanup');
  }
}
