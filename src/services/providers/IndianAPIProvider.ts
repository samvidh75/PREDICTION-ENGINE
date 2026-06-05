/**
 * IndianAPIProvider — Indian equity fundamentals via IndianAPI.in.
 * 
 * TRACK-8A: Tier 2 FinancialProvider with Indian-specific coverage.
 * 
 * API Key: INDIANAPI_KEY env var (already configured)
 * Cost: ₹499/month — Tier 2 fallback after Finnhub
 */

import { FinancialProvider, FinancialData } from './FinancialProvider';
import { RetryPolicy } from './RetryPolicy';

const RETRY_OPTS = { retries: 2, minDelayMs: 500, maxDelayMs: 3000 };
const API_BASE = 'https://stock.indianapi.in';

export class IndianAPIProvider implements FinancialProvider {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey 
      || (typeof process !== 'undefined' && process.env?.INDIANAPI_KEY)
      || '';
    if (!this.apiKey) throw new Error('IndianAPI: INDIANAPI_KEY not configured');
  }

  async getFinancials(symbol: string): Promise<FinancialData> {
    const clean = symbol.toUpperCase().replace(/\.(NS|BO|NSE|BSE)$/i, '');
    const data = await this.fetchJson(`${API_BASE}/stock_fundamentals?name=${encodeURIComponent(clean)}`);
    
    if (!data || data.error) {
      throw new Error(`IndianAPI: no fundamentals for ${clean}`);
    }

    const f = data.fundamentals || data;
    
    const n = (val: any): number | undefined => {
      if (val === null || val === undefined || val === '') return undefined;
      const v = Number(val);
      return isNaN(v) ? undefined : v;
    };

    // Extract all values as locals (avoids nested ternary TS narrowing issues)
    const r = {
      roe: n(f.roe) ?? n(f.return_on_equity),
      mcap: n(f.market_cap) ?? n(f.market_capitalization),
      roce: n(f.roce),
      roicRaw: n(f.roic),
      grossMargin: n(f.gross_margin),
      operatingMargin: n(f.operating_margin),
      opm: n(f.opm),
      npm: n(f.npm),
      netProfitMargin: n(f.net_profit_margin),
      revGrowth3y: n(f.revenue_growth_3y),
      revGrowth: n(f.revenue_growth),
      salesGrowth3y: n(f.sales_growth_3y),
      epsGrowth3y: n(f.eps_growth_3y),
      earningsGrowth: n(f.earnings_growth),
      fcfGrowth3y: n(f.fcf_growth_3y),
      profitGrowth3y: n(f.profit_growth_3y),
      netProfitGrowth3y: n(f.net_profit_growth_3y),
      divYield: n(f.dividend_yield),
      fcf: n(f.free_cash_flow) ?? n(f.fcf),
      fcfYieldRaw: n(f.fcf_yield),
      debtToEquity: n(f.debt_to_equity),
      currentRatio: n(f.current_ratio),
      interestCoverage: n(f.interest_coverage) ?? n(f.interest_coverage_ratio),
      beta: n(f.beta),
      pe: n(f.pe_ratio) ?? n(f.pe),
      pb: n(f.pb_ratio) ?? n(f.price_to_book),
      evEbitda: n(f.ev_to_ebitda) ?? n(f.ev_ebitda) ?? n(f.enterprise_value_to_ebitda),
      eps: n(f.eps) ?? n(f.earnings_per_share),
    };

    // Derive fcfYield
    const fcfYield = r.fcf && r.mcap && r.mcap > 0
      ? r.fcf / r.mcap
      : r.fcfYieldRaw;

    // Percentage normalization helper
    const pct = (v: number | undefined): number | undefined =>
      v !== undefined ? v / 100 : undefined;

    return {
      symbol: clean,
      periodEnd: new Date().toISOString().split('T')[0],

      marketCap: r.mcap ? r.mcap * 10_000_000 : undefined,
      peRatio: r.pe,
      pbRatio: r.pb,
      evEbitda: r.evEbitda,
      eps: r.eps,
      fcfYield,

      roe: pct(r.roe),
      roic: pct(r.roce) ?? pct(r.roicRaw),
      grossMargin: pct(r.grossMargin),
      operatingMargin: pct(r.operatingMargin) ?? pct(r.opm),
      netMargin: pct(r.netProfitMargin) ?? pct(r.npm),

      revenueGrowth: pct(r.revGrowth3y) ?? pct(r.revGrowth) ?? pct(r.salesGrowth3y),
      epsGrowth: pct(r.epsGrowth3y) ?? pct(r.earningsGrowth),
      fcfGrowth: pct(r.fcfGrowth3y),
      profitGrowth: pct(r.profitGrowth3y) ?? pct(r.netProfitGrowth3y),

      debtToEquity: r.debtToEquity,
      currentRatio: r.currentRatio,
      interestCoverage: r.interestCoverage,
      freeCashFlow: r.fcf,
      beta: r.beta,
      dividendYield: pct(r.divYield),

      _raw: {
        source: 'IndianAPI.in /stock_fundamentals',
        fieldsAvailable: data?.fundamentals ? Object.keys(data.fundamentals) : [],
      },
    };
  }

  private async fetchJson(url: string): Promise<any> {
    return RetryPolicy.execute(async () => {
      const resp = await fetch(url, {
        headers: { 'X-Api-Key': this.apiKey, 'Accept': 'application/json' },
      });
      if (resp.status === 429) throw new Error('IndianAPI: rate limited (429)');
      if (!resp.ok) throw new Error(`IndianAPI HTTP ${resp.status}: ${resp.statusText}`);
      return resp.json();
    }, RETRY_OPTS);
  }
}
