/**
 * SnapshotFreshnessMonitor — TRACK-35 Group C4
 * Checks how fresh each snapshot table is.
 */
import pool from '../db/index';

export interface FreshnessEntry {
  table: string;
  lastDate: string | null;
  daysSinceLast: number | null;
  status: 'fresh' | 'stale' | 'empty';
}

export interface FreshnessReport {
  tables: FreshnessEntry[];
  overallStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

export class SnapshotFreshnessMonitor {
  async check(): Promise<FreshnessReport> {
    const tables: FreshnessEntry[] = [];
    let dbOk = false;
    try { await pool.query('SELECT 1'); dbOk = true; } catch {/* silent */}

    if (!dbOk) {
      return {
        tables: [{ table: 'DATABASE', lastDate: null, daysSinceLast: null, status: 'empty' }],
        overallStatus: 'OFFLINE',
      };
    }

    const checks = [
      { table: 'daily_prices', col: 'trade_date' },
      { table: 'financial_snapshots', col: 'period_end' },
      { table: 'factor_snapshots', col: 'snapshot_date' },
    ];

    for (const { table, col } of checks) {
      try {
        const r = await pool.query(`SELECT MAX(${col}) mx FROM ${table}`);
        const lastDate = r.rows[0]?.mx;
        if (!lastDate) {
          tables.push({ table, lastDate: null, daysSinceLast: null, status: 'empty' });
        } else {
          const daysSince = Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000);
          const status: 'fresh' | 'stale' | 'empty' = daysSince < 2 ? 'fresh' : daysSince < 7 ? 'stale' : 'empty';
          tables.push({ table, lastDate, daysSinceLast: daysSince, status });
        }
      } catch {
        tables.push({ table, lastDate: null, daysSinceLast: null, status: 'empty' });
      }
    }

    const anyFresh = tables.some(t => t.status === 'fresh');
    const anyStale = tables.some(t => t.status === 'stale');
    return { tables, overallStatus: anyFresh ? 'ONLINE' : anyStale ? 'DEGRADED' : 'OFFLINE' };
  }
}

let _sfmi: any = null;
export function getSnapshotFreshnessMonitor() { if (!_sfmi) _sfmi = new SnapshotFreshnessMonitor(); return _sfmi; }
export const snapshotFreshnessMonitor = new Proxy({}, { get: (_, p) => (getSnapshotFreshnessMonitor() as any)[p] });
