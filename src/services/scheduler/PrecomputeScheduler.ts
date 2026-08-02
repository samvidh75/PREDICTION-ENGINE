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
import { EodDataCacheService } from '../marketData/EodDataCacheService';
import { runScanner, SCANNER_PRESETS, type ScannerPreset } from '../../research/scanner/scannerEngine';
import { trackThesis } from '../../research/watchlist/watchlistEngine';

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
  // Healthometer snapshots — store cached quote/financials per symbol
  // -----------------------------------------------------------------------

  static async runHealthometer(): Promise<boolean> {
    const symbols = await PrecomputeScheduler.getActiveUniverse();
    let ok = true;

    for (const symbol of symbols) {
      try {
        const quote = await EodDataCacheService.get<Record<string, unknown>>('quote', symbol);
        const profile = await EodDataCacheService.get<Record<string, unknown>>('profile', symbol);
        const financials = await EodDataCacheService.get<Record<string, unknown>>('financials', symbol);

        await writeSnapshot('healthometer', symbol, {
          symbol,
          computedAt: new Date().toISOString(),
          engine: 'deterministic',
          cached: { quote, profile, financials },
        });
      } catch {
        ok = false;
      }
    }

    return ok;
  }

  // -----------------------------------------------------------------------
  // Scanner snapshots (all presets) — runs actual scanner engine per preset
  // -----------------------------------------------------------------------

  static async runScanner(): Promise<boolean> {
    const presets = Object.keys(SCANNER_PRESETS) as ScannerPreset[];
    const symbols = await PrecomputeScheduler.getActiveUniverse();

    // Build ScannerCompanyInput array from cached data
    const companies: Array<{
      symbol: string;
      scores: Record<string, number>;
      narrativeKey: number;
    }> = [];

    const BASE_TIME = Date.now();

    for (const symbol of symbols) {
      try {
        const financials =
          await EodDataCacheService.get<Record<string, unknown>>('financials', symbol);
        if (!financials) continue;

        const narrativeKey = (BASE_TIME + companies.length) % 1000;
        companies.push({
          symbol,
          scores: financials as unknown as Record<string, number>,
          narrativeKey,
        });
      } catch {
        // Skip symbol on cache miss
      }
    }

    let ok = true;
    for (const preset of presets) {
      try {
        const results = runScanner(preset, companies);
        await writeSnapshot('scanner', preset, {
          preset,
          computedAt: new Date().toISOString(),
          engine: 'deterministic',
          results: results.slice(0, 50),
          totalCandidates: companies.length,
        });
      } catch {
        ok = false;
      }
    }
    return ok;
  }

  // -----------------------------------------------------------------------
  // Rankings — rank symbols by cached quote price
  // -----------------------------------------------------------------------

  static async runRankings(): Promise<boolean> {
    try {
      const symbols = await PrecomputeScheduler.getActiveUniverse();
      const entries: Array<{ symbol: string; score: number | null }> = [];

      for (const symbol of symbols) {
        try {
          const quote =
            await EodDataCacheService.get<Record<string, unknown>>('quote', symbol);
          entries.push({
            symbol,
            score: (quote?.price as number) ?? null,
          });
        } catch {
          entries.push({ symbol, score: null });
        }
      }

      entries.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      await writeSnapshot('rankings', 'all', {
        computedAt: new Date().toISOString(),
        engine: 'deterministic',
        entries: entries.slice(0, 200),
      });
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Event evidence — count cached news per symbol
  // -----------------------------------------------------------------------

  static async runEventEvidence(): Promise<boolean> {
    try {
      const symbols = await PrecomputeScheduler.getActiveUniverse();
      const evidence: Array<{ symbol: string; newsCount: number }> = [];

      for (const symbol of symbols) {
        try {
          const news = await EodDataCacheService.get<unknown[]>('news', symbol);
          evidence.push({
            symbol,
            newsCount: Array.isArray(news) ? news.length : 0,
          });
        } catch {
          evidence.push({ symbol, newsCount: 0 });
        }
      }

      await writeSnapshot('event_evidence', 'latest', {
        computedAt: new Date().toISOString(),
        engine: 'deterministic',
        symbolsWithEvidence: evidence.filter((e) => e.newsCount > 0).length,
        totalSymbols: symbols.length,
      });
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Watchlist thesis refresh — runs trackThesis with cached data
  // -----------------------------------------------------------------------

  static async runWatchlistTheses(): Promise<boolean> {
    try {
      const symbols = await PrecomputeScheduler.getActiveUniverse();
      const theses: Array<ReturnType<typeof trackThesis>> = [];

      for (const symbol of symbols) {
        try {
          const profile =
            await EodDataCacheService.get<{ name?: string }>('profile', symbol);
          const quote =
            await EodDataCacheService.get<{ price?: number }>('quote', symbol);

          const thesis = trackThesis({
            symbol,
            companyName: profile?.name ?? symbol,
            currentScore: quote?.price ?? null,
            previousScore: null,
            factorChanges: [],
            riskChanges: [],
            lastUpdated: new Date().toISOString(),
          });
          theses.push(thesis);
        } catch {
          // Skip symbols with insufficient cached data
        }
      }

      await writeSnapshot('watchlist_thesis', 'all', {
        computedAt: new Date().toISOString(),
        engine: 'deterministic',
        theses,
      });
      return true;
    } catch {
      return false;
    }
  }

  // -----------------------------------------------------------------------
  // Active universe helper
  // -----------------------------------------------------------------------

  private static async getActiveUniverse(): Promise<string[]> {
    try {
      // Keys are eod:NAMESPACE:SYMBOL — fetch them all and extract unique symbols in JS
      // for cross-DB compatibility (PG SPLIT_PART vs SQLite).
      const res = await dbAdapter.query(
        `SELECT DISTINCT key FROM cache
         WHERE key LIKE 'eod:%'
           AND expires_at > CURRENT_TIMESTAMP
         LIMIT 2500`,
      );
      const symbols = [
        ...new Set(
          res.rows
            .map((r: { key: string }) => r.key.split(':')[2])
            .filter(Boolean),
        ),
      ];
      return symbols;
    } catch {
      return [];
    }
  }
}
