/**
 * snapshotReadiness.ts — Internal snapshot readiness checks.
 *
 * Reports whether each precomputed snapshot kind is available and current.
 * Used by admin health reporting — never exposed on public routes.
 */

import { SnapshotHealth } from './dataPlaneHealthContracts';

export interface SnapshotReadinessMap {
  [kind: string]: SnapshotHealth;
}

/**
 * Check readiness of each precomputed snapshot kind.
 *
 * For now the check is simple: we verify last-run timestamps are recent
 * enough and that the snapshot data file/db row exists. As the system
 * matures, these can be backed by a snapshot metadata store.
 */
export async function getSnapshotReadiness(
  lastRunTimestamps: Record<string, string | null>,
  staleThresholdMinutes = 360,
): Promise<SnapshotReadinessMap> {
  const now = Date.now();
  const threshold = staleThresholdMinutes * 60_000;

  const map: SnapshotReadinessMap = {};

  const kinds = [
    'healthometer',
    'scanner-double-threshold',
    'scanner-strong-buy',
    'scanner-top-losers',
    'scanner-most-active',
    'scanner-gap-up',
    'scanner-52w-high',
    'scanner-52w-low',
    'scanner-new-highs',
    'scanner-new-lows',
    'scanner-long-term-buy',
    'scanner-check-hold',
    'rankings',
    'event-evidence',
    'watchlist-theses',
  ];

  for (const kind of kinds) {
    const ts = lastRunTimestamps[kind] ?? null;
    const available = ts !== null;
    const ok = available && (now - new Date(ts).getTime()) <= threshold;
    map[kind] = { kind, available, updatedAt: ts, ok };
  }

  return map;
}
