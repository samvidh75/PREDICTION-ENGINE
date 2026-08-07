/**
 * Fundamentals Provider: Fetches fundamental data for a symbol.
 *
 * Primary path — LIVE DB (honest data end-to-end):
 *   financial_snapshots  → latest PSE EDGE disclosure (eps, roe, roa, margins,
 *                          growth, debt/equity, ...) loaded by
 *                          scripts/load-pse-financials.ts
 *   feature_snapshots    → latest real volatility from daily prices
 *   daily_prices         → latest close
 *   symbols              → sector / industry
 * Valuation ratios PSE EDGE does not disclose (pe, pb, ev/ebitda, ...) stay
 * null — nothing is guessed at.
 *
 * Fallback path — persisted verified PSE universe (data/stock-universe.json)
 * so the endpoint still answers when the DB has no row for a symbol or the
 * database adapter is unavailable.
 */
import { query } from '../../db/index.js';
import { getPersistedStockResearch } from '../../lib/stockResearchSnapshot.js';

export interface FundamentalsResult {
  symbol: string;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roic: number | null;
  debtToEquity: number | null;
  evEbitda: number | null;
  fcfYield: number | null;
  dividendYield: number | null;
  marketCap: number;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  eps: number | null;
  volatility: number | null;
  price: number;
  sector: string;
  industry: string;
  dataSource: string;
}

/** Parse a DB value to a finite number, else null. */
function fin(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function fetchFundamentals(symbol: string): Promise<FundamentalsResult | null> {
  const sym = symbol.toUpperCase().trim();

  // ── 1) Live DB: real PSE EDGE disclosures + real price/features ──
  try {
    const [fsRes, featRes, priceRes, symRes] = await Promise.all([
      query(
        `SELECT snapshot_date, market_cap, pe_ratio, eps, dividend_yield, beta,
                fcf_yield, ev_ebitda, roa, roe, roic, debt_to_equity, current_ratio,
                revenue_growth, profit_growth, eps_growth, fcf_growth,
                gross_margin, operating_margin, net_margin, pb_ratio
         FROM financial_snapshots
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         ORDER BY snapshot_date DESC LIMIT 1`,
        [sym]
      ),
      query(
        `SELECT volatility FROM feature_snapshots
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         ORDER BY trade_date DESC LIMIT 1`,
        [sym]
      ),
      query(
        `SELECT close FROM daily_prices
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         ORDER BY trade_date DESC LIMIT 1`,
        [sym]
      ),
      query(
        `SELECT sector, industry FROM symbols
         WHERE UPPER(REPLACE(symbol, ' ', '')) = $1 LIMIT 1`,
        [sym]
      ),
    ]);

    const fsRow = fsRes.rows?.[0];
    if (fsRow) {
      const meta = symRes.rows?.[0] ?? {};
      const price = priceRes.rows?.[0] ? fin(priceRes.rows[0].close) ?? 0 : 0;
      return {
        symbol: sym,
        pe: fin(fsRow.pe_ratio),
        pb: fin(fsRow.pb_ratio),
        roe: fin(fsRow.roe),
        roic: fin(fsRow.roic),
        debtToEquity: fin(fsRow.debt_to_equity),
        evEbitda: fin(fsRow.ev_ebitda),
        fcfYield: fin(fsRow.fcf_yield),
        dividendYield: fin(fsRow.dividend_yield),
        marketCap: fin(fsRow.market_cap) ?? 0,
        revenueGrowth: fin(fsRow.revenue_growth),
        profitGrowth: fin(fsRow.profit_growth),
        eps: fin(fsRow.eps),
        volatility: featRes.rows?.[0] ? fin(featRes.rows[0].volatility) : null,
        price,
        sector: meta.sector ? String(meta.sector) : '',
        industry: meta.industry ? String(meta.industry) : '',
        dataSource: 'PSE EDGE disclosures (financial_snapshots)',
      };
    }
  } catch {
    // DB unavailable or no adapter — fall through to the persisted universe.
  }

  // ── 2) Fallback: persisted verified PSE universe snapshot ──
  try {
    const research = await getPersistedStockResearch(symbol);
    if (!research) return null;

    return {
      symbol: research.symbol,
      pe: research.pe,
      pb: research.pb,
      roe: research.roe,
      roic: null,
      debtToEquity: research.debtToEquity,
      evEbitda: null,
      fcfYield: null,
      dividendYield: research.dividendYield,
      marketCap: research.marketCap,
      revenueGrowth: research.revenueGrowth,
      profitGrowth: research.profitGrowth,
      eps: research.eps,
      volatility: research.volatility,
      price: research.price,
      sector: research.sector,
      industry: research.industry,
      dataSource: 'persisted-universe',
    };
  } catch {
    return null;
  }
}

