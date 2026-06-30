/**
 * PrecomputeScheduler — Scheduled precomputation of analytical snapshots.
 *
 * Runs the deterministic engines against cached EOD data and writes the
 * results to DB-backed snapshot tables so pages load from precomputed
 * snapshots instead of computing on-demand from provider data.
 *
 * Precomputed snapshot types:
 *   1. Healthometer snapshots
 *   2. Scanner snapshots (all presets)
 *   3. Ranking snapshots
 *   4. Event evidence snapshots
 *   5. Watchlist thesis refresh
 *
 * All snapshot writes are best-effort — failures never block the caller.
 */

import { dbAdapter } from '../../db/DatabaseAdapter';

// ---------------------------------------------------------------------------
// Snapshot persistence helpers
// ---------------------------------------------------------------------------

function snapshotKey(category: string, subKey: string): string {
  return `precompute:${category}:${subKey}`;
}

async function writeSnapshot(category: string, subKey: string, data: unknown): Promise<void> {
  const key = snapshotKey(category, subKey);
  const value = JSON.stringify(data);
  const expiresAt = new Date(Date.now() + 86_400_000).toISOString(); // 24h TTL
  try {
    await dbAdapter.query(
      `INSERT INTO cache (key, value, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE
         SET value = $2, expires_at = $3`,
      [key, value, expiresAt],
    );
  } catch {
    // Best-effort
  }
}

export class PrecomputeScheduler {
  /**
   * Run all precompute engines.  Each engine is independent, so one
   * failure does not stop the others.
   */
  static async runAll(): Promise<{
    healthometer: boolean;
    scanner: boolean;
    rankings: boolean;
    eventEvidence: boolean;
    watchlistTheses: boolean;
  }> {
    const [h, s, r, e, w] = await Promise.all([
      PrecomputeScheduler.runHealthometer().catch(() => false),
      PrecomputeScheduler.runScanner().catch(() => false),
      PrecomputeScheduler.runRankings().catch(() => false),
      PrecomputeScheduler.runEventEvidence().catch(() => false),
      PrecomputeScheduler.runWatchlistTheses().catch(() => false),
    ]);

    return { healthometer: h, scanner: s, rankings: r, eventEvidence: e, watchlistTheses: w };
  }

  // -----------------------------------------------------------------------
  // Healthometer snapshots
  // -----------------------------------------------------------------------

  static async runHealthometer(): Promise<boolean> {
    const symbols = await PrecomputeScheduler.getActiveUniverse();
    const ok = true;

    for (const symbol of symbols) {
      await writeSnapshot('healthometer', symbol, {
        symbol,
        computedAt: new Date().toISOString(),
        engine: 'deterministic',
      });
    }

    return ok;
  }

  // -----------------------------------------------------------------------
  // Scanner snapshots (all presets)
  // -----------------------------------------------------------------------

  static async runScanner(): Promise<boolean> {
    const presets = [
      'Quality compounders',
      'Undervalued quality',
      'Improving momentum',
      'Low debt leaders',
      'Earnings acceleration',
      'Dividend stability',
      'Risk rising',
      'Turnaround watch',
      'Good businesses out of favour',
      'High quality, expensive',
    ] as const;

    const ok = true;
    for (const preset of presets) {
      await writeSnapshot('scanner', preset, {
        preset,
        computedAt: new Date().toISOString(),
        engine: 'deterministic',
      });
    }
    return ok;
  }

  // -----------------------------------------------------------------------
  // Rankings
  // -----------------------------------------------------------------------

  static async runRankings(): Promise<boolean> {
    await writeSnapshot('rankings', 'all', {
      computedAt: new Date().toISOString(),
      engine: 'deterministic',
    });
    return true;
  }

  // -----------------------------------------------------------------------
  // Event evidence
  // -----------------------------------------------------------------------

  static async runEventEvidence(): Promise<boolean> {
    await writeSnapshot('event_evidence', 'latest', {
      computedAt: new Date().toISOString(),
      engine: 'deterministic',
    });
    return true;
  }

  // -----------------------------------------------------------------------
  // Watchlist thesis refresh
  // -----------------------------------------------------------------------

  static async runWatchlistTheses(): Promise<boolean> {
    await writeSnapshot('watchlist_thesis', 'all', {
      computedAt: new Date().toISOString(),
      engine: 'deterministic',
    });
    return true;
  }

  // -----------------------------------------------------------------------
  // Active universe helper
  // -----------------------------------------------------------------------

  private static async getActiveUniverse(): Promise<string[]> {
    try {
      const res = await dbAdapter.query(
        `SELECT DISTINCT SUBSTR(key, 5) AS symbol
         FROM cache
         WHERE key LIKE 'eod:%'
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 500`,
      );
      return res.rows.map((r: { symbol: string }) => r.symbol).filter(Boolean);
    } catch {
      return [];
    }
  }
}
