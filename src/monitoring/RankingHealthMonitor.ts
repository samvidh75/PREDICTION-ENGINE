/**
 * RankingHealthMonitor — TRACK-35 Group C5
 * Checks ranking pipeline health.
 */
import pool from '../db/index';

export interface RankingHealth {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  lastRankingDate: string | null;
  symbolCount: number;
  avgScore: number | null;
  warnings: string[];
}

export class RankingHealthMonitor {
  async check(): Promise<RankingHealth> {
    const warnings: string[] = [];
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {}

    if (!dbOk) {
      warnings.push('Database unavailable');
      return { status: 'OFFLINE', lastRankingDate: null, symbolCount: 0, avgScore: null, warnings };
    }

    let symbolCount = 0;
    let lastRankingDate: string | null = null;
    let avgScore: number | null = null;

    try {
      const r = await pool.query('SELECT COUNT(*) c FROM factor_snapshots');
      symbolCount = parseInt(r.rows[0]?.c ?? 0);
      if (symbolCount === 0) {
        warnings.push('No factor data — factor_snapshots is empty');
      }
    } catch {
      warnings.push('factor_snapshots table not found');
    }

    try {
      const r = await pool.query('SELECT MAX(snapshot_date) mx, AVG(factor_score) av FROM factor_snapshots');
      lastRankingDate = r.rows[0]?.mx ?? null;
      avgScore = r.rows[0]?.av ? Math.round(parseFloat(r.rows[0].av) * 100) / 100 : null;
    } catch {}

    if (symbolCount > 0 && avgScore != null) {
      return { status: 'ONLINE', lastRankingDate, symbolCount, avgScore, warnings };
    }
    if (symbolCount > 0) {
      return { status: 'DEGRADED', lastRankingDate, symbolCount, avgScore: null, warnings };
    }
    return { status: 'OFFLINE', lastRankingDate: null, symbolCount: 0, avgScore: null, warnings: ['No factor data'] };
  }
}

let _rhmi: any = null;
export function getRankingHealthMonitor() { if (!_rhmi) _rhmi = new RankingHealthMonitor(); return _rhmi; }
export const rankingHealthMonitor = new Proxy({}, { get: (_, p) => (getRankingHealthMonitor() as any)[p] });
