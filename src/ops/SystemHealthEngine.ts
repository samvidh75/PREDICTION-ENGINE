import pool from '../db/index';

export interface HealthComponent {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  score: number; // 0-100
  detail: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  components: HealthComponent[];
  overall_score: number;
  checked_at: string;
}

export class SystemHealthEngine {
  async check(): Promise<SystemHealth> {
    const components: HealthComponent[] = [];

    // 1. DB health
    try {
      await pool.query('SELECT 1');
      components.push({ name: 'Database', status: 'healthy', score: 100, detail: 'PostgreSQL connection active.' });
    } catch (err: any) {
      components.push({ name: 'Database', status: 'down', score: 0, detail: `Connection failed: ${err.message}` });
    }

    // 2. Provider health — check data recency
    try {
      const r = await pool.query(
        `SELECT COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM symbols WHERE listing_status = 'active'), 0) * 100 AS pct
         FROM financial_snapshots WHERE period_end >= CURRENT_DATE - INTERVAL '90 days'`
      );
      const pct = Number(r.rows[0]?.pct || 0);
      let status: 'healthy' | 'degraded' | 'down';
      if (pct > 70) status = 'healthy';
      else if (pct > 30) status = 'degraded';
      else status = 'down';
      components.push({ name: 'Provider Data', status, score: Math.round(pct), detail: `${pct.toFixed(1)}% of symbols have financial data < 90 days old.` });
    } catch {
      components.push({ name: 'Provider Data', status: 'down', score: 0, detail: 'Failed to query financial_snapshots.' });
    }

    // 3. Pipeline health — check factor_snapshots has recent data
    try {
      const r = await pool.query(`SELECT MAX(trade_date) AS d FROM factor_snapshots`);
      const d = r.rows[0]?.d;
      if (d) {
        const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
        let status: 'healthy' | 'degraded' | 'down';
        if (days < 7) status = 'healthy';
        else if (days < 30) status = 'degraded';
        else status = 'down';
        components.push({ name: 'Factor Pipeline', status, score: Math.max(0, 100 - days * 3), detail: `Latest factor snapshot: ${d} (${days} days ago).` });
      } else {
        components.push({ name: 'Factor Pipeline', status: 'down', score: 0, detail: 'No factor_snapshots found.' });
      }
    } catch {
      components.push({ name: 'Factor Pipeline', status: 'down', score: 0, detail: 'Query failed.' });
    }

    // 4. Feature pipeline
    try {
      const r = await pool.query(`SELECT MAX(trade_date) AS d FROM feature_snapshots`);
      const d = r.rows[0]?.d;
      if (d) {
        const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
        let status: 'healthy' | 'degraded' | 'down';
        if (days < 7) status = 'healthy';
        else if (days < 30) status = 'degraded';
        else status = 'down';
        components.push({ name: 'Feature Pipeline', status, score: Math.max(0, 100 - days * 3), detail: `Latest feature snapshot: ${d} (${days} days ago).` });
      } else {
        components.push({ name: 'Feature Pipeline', status: 'down', score: 0, detail: 'No feature_snapshots found.' });
      }
    } catch {
      components.push({ name: 'Feature Pipeline', status: 'down', score: 0, detail: 'Query failed.' });
    }

    // 5. Prediction health
    try {
      const r = await pool.query(`SELECT COUNT(*) AS c FROM prediction_registry WHERE prediction_date >= CURRENT_DATE - INTERVAL '30 days'`);
      const c = parseInt(r.rows[0]?.c || '0');
      let status: 'healthy' | 'degraded' | 'down';
      if (c > 0) status = 'healthy';
      else status = 'degraded';
      components.push({ name: 'Prediction Engine', status, score: c > 0 ? 100 : 50, detail: `${c} predictions in the last 30 days.` });
    } catch {
      components.push({ name: 'Prediction Engine', status: 'down', score: 0, detail: 'Query failed or table missing.' });
    }

    const overallScore = Math.round(components.reduce((sum, c) => sum + c.score, 0) / Math.max(components.length, 1));
    let overall: SystemHealth['status'];
    if (overallScore >= 80) overall = 'healthy';
    else if (overallScore >= 40) overall = 'degraded';
    else overall = 'down';

    return {
      status: overall,
      components,
      overall_score: overallScore,
      checked_at: new Date().toISOString(),
    };
  }
}

export const systemHealthEngine = new SystemHealthEngine();
export default SystemHealthEngine;
