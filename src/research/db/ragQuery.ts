/**
 * RAG Query: Fetches structured context for LLM grounding from PostgreSQL.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Lazy singleton: @supabase/supabase-js throws synchronously if the URL is
// empty, which previously crashed the whole server at import time whenever
// SUPABASE_URL wasn't set (e.g. local dev without that secret configured).
let supabase: SupabaseClient | null | undefined;

function getSupabaseClient(): SupabaseClient | null {
  if (supabase !== undefined) return supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  supabase = url && key ? createClient(url, key) : null;
  return supabase;
}

export async function queryRAGContext(symbol: string) {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('stock_research')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error || !data) return null;

    return {
      pe: data.pe,
      pb: data.pb,
      roe: data.roe,
      roic: data.roic,
      debtToEquity: data.debt_to_equity,
      currentRatio: data.current_ratio,
      fcfYield: data.fcf_yield,
      operatingMargin: data.operating_margin,
      revenueCAGR_3y: data.revenue_cagr_3y,
      profitCAGR_3y: data.profit_cagr_3y,
      revenueGrowth_YoY: data.revenue_growth_yoy,
      profitGrowth_YoY: data.profit_growth_yoy,
      volatility_30d: data.volatility_30d,
      maxDrawdown_52w: data.max_drawdown_52w,
      beta: data.beta,
      sharpeRatio: data.sharpe_ratio,
      recentNews: data.recent_news || [],
      companyName: data.company_name,
      sector: data.sector,
      foundedYear: data.founded_year,
      marketCap: data.market_cap,
      promoterHolding: data.promoter_holding,
      pledgedPercentage: data.pledged_percentage
    };
  } catch {
    return null;
  }
}
