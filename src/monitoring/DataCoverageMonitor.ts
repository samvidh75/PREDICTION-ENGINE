/**
 * DataCoverageMonitor — TRACK-35 Group C3
 * Tracks data coverage metrics from DB with graceful failure.
 */
import pool from '../db/index';

export interface TableCoverage {
  table: string;
  rowCount: number;
  symbolCount: number;
  status: 'online' | 'degraded' | 'offline';
}

export interface CoverageSnapshot {
  tables: TableCoverage[];
  overallStatus: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  timestamp: string;
}

export class DataCoverageMonitor {
  async snapshot(): Promise<CoverageSnapshot> {
    const timestamp = new Date().toISOString();
    const tables: TableCoverage[] = [];

    try { await pool.query('SELECT 1'); } catch (e: any) {
      return { tables: [], overallStatus: 'OFFLINE', timestamp };
    }

    const tableDefs = [
      ['daily_prices', 'trade_date'],
    ];

    for (const [table, dateCol] of tableDefs) {
      try {
        const r = await pool.query(`SELECT COUNT(*) c, COUNT(DISTINCT symbol) s FROM ${table}`);
        const rowCount = parseInt(r.rows[0]?.c ?? 0);
        const symbolCount = parseInt(r.rows[0]?.s ?? 0);
        tables.push({ table, rowCount, symbolCount, status: rowCount > 0 ? 'online' : 'offline' });
      } catch {
        tables.push({ table, rowCount: 0, symbolCount: 0, status: 'offline' });
      }
    }

    const anyOnline = tables.some(t => t.status === 'online');
    return { tables, overallStatus: anyOnline ? 'ONLINE' : 'OFFLINE', timestamp };
  }
}

let _dcmi: any = null;
export function getDataCoverageMonitor() { if (!_dcmi) _dcmi = new DataCoverageMonitor(); return _dcmi; }
export const dataCoverageMonitor = new Proxy({}, { get: (_, p) => (getDataCoverageMonitor() as any)[p] });
