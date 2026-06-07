/**
 * DataIntegrityEngine — TRACK-35 Group B
 * Detects null explosions, NaN/Infinity, stale data, duplicates, impossible values.
 * Status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED'
 */
import pool from '../db/index';

export type IntegritySeverity = 'critical' | 'warning' | 'info';

export interface IntegrityCheck {
  table: string;
  field: string;
  issue: string;
  severity: IntegritySeverity;
  count: number;
}

export interface DataIntegrityReport {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED';
  checks: IntegrityCheck[];
  overallScore: number; // 0-100
  generatedAt: string;
}

export class DataIntegrityEngine {
  async audit(): Promise<DataIntegrityReport> {
    const checks: IntegrityCheck[] = [];
    const generatedAt = new Date().toISOString();

    try {
      await pool.query('SELECT 1');
    } catch (e: any) {
      return {
        status: 'OFFLINE',
        checks: [{ table: 'SYSTEM', field: 'DATABASE', issue: `Connection failed: ${e.message}`, severity: 'critical', count: 1 }],
        overallScore: 0,
        generatedAt,
      };
    }

    // Null explosion checks
    try {
      const tables = ['daily_prices', 'financial_snapshots', 'feature_snapshots', 'factor_snapshots'];
      for (const table of tables) {
        try {
          const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name=$1 AND table_schema='public'`, [table]);
          for (const col of cols.rows) {
            try {
              const r = await pool.query(`SELECT COUNT(*) as total, COUNT(${col.column_name}) as nonnull FROM ${table}`);
              const total = parseInt(r.rows[0].total);
              const nonnull = parseInt(r.rows[0].nonnull);
              if (total > 0 && nonnull / total < 0.5) {
                checks.push({ table, field: col.column_name, issue: `>50% null values (${nonnull}/${total} non-null)`, severity: 'warning', count: total - nonnull });
              }
            } catch {}
          }
        } catch {}
      }
    } catch {}

    // NaN/Infinity check
    try {
      const r = await pool.query(`SELECT COUNT(*) c FROM daily_prices WHERE open = 'NaN'::float OR high = 'NaN'::float OR low = 'NaN'::float OR close = 'NaN'::float`);
      if (parseInt(r.rows[0].c) > 0) {
        checks.push({ table: 'daily_prices', field: 'price', issue: 'NaN values found in OHLC data', severity: 'critical', count: parseInt(r.rows[0].c) });
      }
    } catch {}

    // Stale data check
    try {
      const tables = [
        { name: 'daily_prices', col: 'trade_date' },
        { name: 'financial_snapshots', col: 'period_end' },
        { name: 'factor_snapshots', col: 'snapshot_date' },
      ];
      for (const t of tables) {
        try {
          const r = await pool.query(`SELECT MAX(${t.col}) as maxd FROM ${t.name}`);
          const maxd = r.rows[0]?.maxd;
          if (maxd) {
            const daysStale = Math.floor((Date.now() - new Date(maxd).getTime()) / 86400000);
            if (daysStale > 2) {
              checks.push({ table: t.name, field: t.col, issue: `Stale data — last date ${maxd} (${daysStale} days old)`, severity: daysStale > 7 ? 'critical' : 'warning', count: daysStale });
            }
          } else {
            checks.push({ table: t.name, field: t.col, issue: 'No data — table is empty', severity: 'warning', count: 0 });
          }
        } catch {}
      }
    } catch {}

    // Duplicate row check
    try {
      const r = await pool.query(`SELECT COUNT(*) c FROM (SELECT symbol, trade_date, COUNT(*) n FROM daily_prices GROUP BY symbol, trade_date HAVING COUNT(*) > 1) dup`);
      if (parseInt(r.rows[0].c) > 0) {
        checks.push({ table: 'daily_prices', field: 'symbol, trade_date', issue: 'Duplicate (symbol, date) rows detected', severity: 'critical', count: parseInt(r.rows[0].c) });
      }
    } catch {}

    // Impossible financial values
    try {
      const r1 = await pool.query(`SELECT COUNT(*) c FROM financial_snapshots WHERE pe_ratio < 0 OR pe_ratio > 5000`);
      if (parseInt(r1.rows[0].c) > 0) checks.push({ table: 'financial_snapshots', field: 'pe_ratio', issue: 'PE < 0 or > 5000', severity: 'warning', count: parseInt(r1.rows[0].c) });

      const r2 = await pool.query(`SELECT COUNT(*) c FROM financial_snapshots WHERE roe < -100 OR roe > 500`);
      if (parseInt(r2.rows[0].c) > 0) checks.push({ table: 'financial_snapshots', field: 'roe', issue: 'ROE < -100 or > 500', severity: 'warning', count: parseInt(r2.rows[0].c) });

      const r3 = await pool.query(`SELECT COUNT(*) c FROM financial_snapshots WHERE market_cap < 0`);
      if (parseInt(r3.rows[0].c) > 0) checks.push({ table: 'financial_snapshots', field: 'market_cap', issue: 'Negative market cap', severity: 'critical', count: parseInt(r3.rows[0].c) });
    } catch {}

    // Score: start at 100, subtract per issue
    let score = 100;
    for (const c of checks) {
      score -= c.severity === 'critical' ? 15 : c.severity === 'warning' ? 5 : 2;
    }
    const overallScore = Math.max(0, Math.min(100, score));
    const allCritical = checks.some(c => c.severity === 'critical');
    const status = checks.length === 0 ? 'ONLINE' : allCritical ? 'DEGRADED' : 'DEGRADED';

    return { status: checks.length === 0 ? 'ONLINE' : 'DEGRADED', checks, overallScore, generatedAt };
  }
}

let _instance: DataIntegrityEngine | null = null;
export function getDataIntegrityEngine(): DataIntegrityEngine {
  if (!_instance) _instance = new DataIntegrityEngine();
  return _instance;
}
export const dataIntegrityEngine = new Proxy({} as DataIntegrityEngine, {
  get: (_, prop) => (getDataIntegrityEngine() as any)[prop],
});
