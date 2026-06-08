/**
 * TRACK-96D — Sector Drift Engine
 * 
 * Measures per-sector prediction performance and identifies sectors
 * degrading faster than the platform baseline.
 * 
 * All data from prediction_registry validated outcomes.
 */
import pool from '../db/index';

export interface SectorHealth {
  sector: string;
  hitRate: number;
  avgAlpha: number;
  sampleSize: number;
  driftScore: number;        // deviation from baseline
  status: 'healthy' | 'warning' | 'critical';
}

const SECTORS = ['Financials', 'IT', 'Energy', 'FMCG', 'Auto', 'Pharma', 'Metals', 'Telecom', 'Infrastructure'];

export class SectorDriftEngine {
  async analyze(): Promise<{ sectors: SectorHealth[]; baselineHitRate: number; baselineAlpha: number }> {
    // Get baseline from all validated predictions
    const baselineQuery = `
      SELECT
        ROUND(SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as "hitRate",
        ROUND(AVG(alpha) * 100, 2) as "avgAlpha"
      FROM prediction_registry
      WHERE validation_status = 'validated' AND future_return IS NOT NULL
    `;
    const baselineRes = await pool.query(baselineQuery);
    const baselineHitRate = Number(baselineRes.rows[0]?.hitRate ?? 0);
    const baselineAlpha = Number(baselineRes.rows[0]?.avgAlpha ?? 0);

    const sectors: SectorHealth[] = [];

    for (const sector of SECTORS) {
      try {
        const query = `
          SELECT
            COUNT(*) as total,
            ROUND(SUM(CASE WHEN future_return > 0 THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 2) as hitRate,
            ROUND(AVG(alpha) * 100, 2) as avgAlpha
          FROM prediction_registry
          WHERE validation_status = 'validated'
            AND future_return IS NOT NULL
            AND symbol IN (
              SELECT symbol FROM symbols WHERE sector = '${sector}'
            )
        `;

        const res = await pool.query(query);
        const r = res.rows[0] ?? {};
        const total = Number(r.total ?? 0);
        if (total < 5) continue;

        const hitRate = Number(r.hitRate ?? 0);
        const avgAlpha = Number(r.avgAlpha ?? 0);
        const driftScore = Math.round((hitRate - baselineHitRate) * 10) / 10;

        let status: SectorHealth['status'] = 'healthy';
        if (driftScore < -10) status = 'critical';
        else if (driftScore < -5) status = 'warning';

        sectors.push({ sector, hitRate, avgAlpha, sampleSize: total, driftScore, status });
      } catch {
        // skip sectors with no matching symbol data
      }
    }

    return { sectors, baselineHitRate, baselineAlpha };
  }
}

export const sectorDriftEngine = new SectorDriftEngine();
export default SectorDriftEngine;
