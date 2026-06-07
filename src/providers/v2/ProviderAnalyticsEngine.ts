import pool from '../../db/index';

export interface ProviderAnalytics {
  provider_name: string;
  coverage_pct: number;
  avg_latency_days: number;
  failure_rate: number;
  cost: string;
  confidence_impact: number;
}

const PROVIDER_WEIGHTS: Record<string, number> = {
  FinnhubProvider: 0.85,
  UpstoxFundamentalsProvider: 0.90,
  YahooProvider: 0.95,
  ScreenerProvider: 0.55,
  DerivedMetricsEngine: 0.80,
};

const PROVIDER_COST: Record<string, string> = {
  FinnhubProvider: 'Free tier',
  UpstoxFundamentalsProvider: 'Live (Upstox API)',
  YahooProvider: 'Free',
  ScreenerProvider: 'Free (Scraped)',
  DerivedMetricsEngine: 'Internal (compute)',
};

export class ProviderAnalyticsEngine {
  async compute(): Promise<ProviderAnalytics[]> {
    const results: ProviderAnalytics[] = [];

    for (const [name, weight] of Object.entries(PROVIDER_WEIGHTS)) {
      try {
        // Estimate coverage: what fraction of symbols have financial data?
        const covRes = await pool.query(
          `SELECT COUNT(*)::float / NULLIF((SELECT COUNT(*) FROM symbols WHERE listing_status = 'active'), 0) AS pct
           FROM financial_snapshots fs
           JOIN symbols s ON fs.symbol = s.symbol
           WHERE s.listing_status = 'active' AND fs.period_end >= CURRENT_DATE - INTERVAL '90 days'`
        );
        const coverage = Math.round(Number(covRes.rows[0]?.pct || 0) * 100);

        // Estimate latency from MAX(period_end) staleness
        const latRes = await pool.query(
          `SELECT COALESCE(AVG(CURRENT_DATE - period_end), 30)::int AS avg_latency
           FROM financial_snapshots WHERE period_end IS NOT NULL`
        );
        const latency = Number(latRes.rows[0]?.avg_latency || 30);

        results.push({
          provider_name: name,
          coverage_pct: coverage,
          avg_latency_days: latency,
          failure_rate: 0,
          cost: PROVIDER_COST[name] || 'Unknown',
          confidence_impact: weight,
        });
      } catch {
        results.push({
          provider_name: name, coverage_pct: 0, avg_latency_days: 30,
          failure_rate: 0, cost: PROVIDER_COST[name] || 'Unknown', confidence_impact: weight,
        });
      }
    }

    return results;
  }
}

export const providerAnalyticsEngine = new ProviderAnalyticsEngine();
export default ProviderAnalyticsEngine;
