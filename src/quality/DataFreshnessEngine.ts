import pool from '../db/index';

export interface FreshnessReport {
  symbol: string;
  price_freshness: { last_date: string | null; days_stale: number; status: 'fresh' | 'stale' | 'missing' };
  financial_freshness: { last_date: string | null; days_stale: number; status: 'fresh' | 'stale' | 'missing' };
  factor_freshness: { last_date: string | null; days_stale: number; status: 'fresh' | 'stale' | 'missing' };
  prediction_freshness: { last_date: string | null; days_stale: number; status: 'fresh' | 'stale' | 'missing' };
  overall_freshness_score: number; // 0-100
}

export class DataFreshnessEngine {
  async checkFreshness(symbol: string): Promise<FreshnessReport> {
    const [priceRes, finRes, factRes, predRes] = await Promise.all([
      pool.query(`SELECT MAX(trade_date) AS d FROM daily_prices WHERE symbol = $1`, [symbol]),
      pool.query(`SELECT MAX(period_end) AS d FROM financial_snapshots WHERE symbol = $1`, [symbol]),
      pool.query(`SELECT MAX(trade_date) AS d FROM factor_snapshots WHERE symbol = $1`, [symbol]),
      pool.query(`SELECT MAX(prediction_date) AS d FROM prediction_registry WHERE symbol = $1`, [symbol]),
    ]);

    const today = new Date();

    const evalFreshness = (lastDate: string | null): { last_date: string | null; days_stale: number; status: 'fresh' | 'stale' | 'missing' } => {
      if (!lastDate) return { last_date: null, days_stale: 999, status: 'missing' };
      const d = new Date(lastDate);
      const days = Math.floor((today.getTime() - d.getTime()) / 86400000);
      let status: 'fresh' | 'stale' | 'missing';
      if (days < 3) status = 'fresh';
      else if (days < 30) status = 'stale';
      else status = 'stale';
      return { last_date: lastDate, days_stale: Math.max(0, days), status };
    };

    const pf = evalFreshness(priceRes.rows[0]?.d);
    const ff = evalFreshness(finRes.rows[0]?.d);
    const faf = evalFreshness(factRes.rows[0]?.d);
    const prf = evalFreshness(predRes.rows[0]?.d);

    // Score: each category max 25 points
    const scorePart = (ds: number, missing: boolean): number => {
      if (missing) return 0;
      if (ds < 3) return 25;
      if (ds < 7) return 20;
      if (ds < 14) return 15;
      if (ds < 30) return 10;
      return 5;
    };

    const overall = scorePart(pf.days_stale, pf.status === 'missing') +
      scorePart(ff.days_stale, ff.status === 'missing') +
      scorePart(faf.days_stale, faf.status === 'missing') +
      scorePart(prf.days_stale, prf.status === 'missing');

    return {
      symbol,
      price_freshness: pf,
      financial_freshness: ff,
      factor_freshness: faf,
      prediction_freshness: prf,
      overall_freshness_score: overall,
    };
  }

  async checkAllSymbols(): Promise<{ total: number; fresh: number; stale: number; missing: number }> {
    const r = await pool.query(
      `WITH latest AS (
        SELECT symbol, MAX(trade_date) AS d FROM factor_snapshots GROUP BY symbol
      )
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE CURRENT_DATE - d < 7) AS fresh,
        COUNT(*) FILTER (WHERE CURRENT_DATE - d BETWEEN 7 AND 30) AS stale,
        COUNT(*) FILTER (WHERE CURRENT_DATE - d > 30 OR d IS NULL) AS missing
      FROM latest`
    );
    const row = r.rows[0];
    return {
      total: Number(row.total || 0),
      fresh: Number(row.fresh || 0),
      stale: Number(row.stale || 0),
      missing: Number(row.missing || 0),
    };
  }
}

export const dataFreshnessEngine = new DataFreshnessEngine();
export default DataFreshnessEngine;
