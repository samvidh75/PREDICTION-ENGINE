import { query } from "../../../db";
import type { DataProvider, FundamentalSnapshot, MarketPriceRecord } from "./types";

export class DatabaseSnapshotProvider implements DataProvider {
  id = "existing-database";

  async fetchPrices(symbols: string[], from: string, to: string): Promise<MarketPriceRecord[]> {
    if (symbols.length === 0) return [];
    const normalized = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
    const placeholders = normalized.map((_, i) => `$${i + 1}`).join(",");
    const rows = await query(`SELECT symbol, trade_date, open, high, low, close, volume FROM daily_prices WHERE symbol IN (${placeholders}) AND trade_date >= $${normalized.length + 1} AND trade_date <= $${normalized.length + 2} ORDER BY symbol, trade_date`, [...normalized, from, to]);
    const retrievedAt = new Date().toISOString();
    return rows.rows.map((row) => ({
      symbol: String(row.symbol).trim().toUpperCase(),
      tradingDate: String(row.trade_date).slice(0, 10),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume == null ? null : Number(row.volume),
      source: this.id,
      retrievedAt,
      providerRecordId: `${row.symbol}:${String(row.trade_date).slice(0, 10)}`,
    }));
  }

  async fetchFundamentals(symbols: string[]): Promise<FundamentalSnapshot[]> {
    if (symbols.length === 0) return [];
    const normalized = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
    const placeholders = normalized.map((_, i) => `$${i + 1}`).join(",");
    const rows = await query(`SELECT symbol, period_end, snapshot_date, pe_ratio, pb_ratio, eps, roe, roa, debt_to_equity, revenue_growth, profit_growth AS earnings_growth, operating_margin, dividend_yield, beta, market_cap, free_float, fcf_yield, ev_ebitda, roic, current_ratio, eps_growth, fcf_growth, gross_margin, net_margin FROM financial_snapshots WHERE symbol IN (${placeholders}) ORDER BY symbol, period_end DESC`, normalized);
    const latest = new Map<string, Record<string, unknown>>();
    for (const row of rows.rows) {
      const symbol = String(row.symbol).trim().toUpperCase();
      if (!latest.has(symbol)) latest.set(symbol, { ...row, symbol });
    }
    const retrievedAt = new Date().toISOString();
    return [...latest.values()].map((row) => {
      const fields = ["pe_ratio", "pb_ratio", "eps", "roe", "roa", "debt_to_equity", "revenue_growth", "earnings_growth", "operating_margin", "dividend_yield", "beta", "market_cap", "free_float", "fcf_yield", "ev_ebitda", "roic", "current_ratio", "eps_growth", "fcf_growth", "gross_margin", "net_margin"];
      const present = fields.filter((field) => row[field] != null && Number.isFinite(Number(row[field]))).length;
      return {
        symbol: String(row.symbol),
        fiscalPeriod: String(row.period_end).slice(0, 10),
        asOfDate: String(row.snapshot_date ?? row.period_end).slice(0, 10),
        revenue: null,
        operatingProfit: null,
        netProfit: null,
        totalAssets: null,
        totalDebt: null,
        equity: null,
        cashFlowFromOperations: null,
        eps: row.eps == null ? null : Number(row.eps),
        peRatio: row.pe_ratio == null ? null : Number(row.pe_ratio),
        pbRatio: row.pb_ratio == null ? null : Number(row.pb_ratio),
        roe: row.roe == null ? null : Number(row.roe),
        roa: row.roa == null ? null : Number(row.roa),
        debtToEquity: row.debt_to_equity == null ? null : Number(row.debt_to_equity),
        operatingMargin: row.operating_margin == null ? null : Number(row.operating_margin),
        revenueGrowth: row.revenue_growth == null ? null : Number(row.revenue_growth),
        earningsGrowth: row.earnings_growth == null ? null : Number(row.earnings_growth),
        dividendYield: row.dividend_yield == null ? null : Number(row.dividend_yield),
        beta: row.beta == null ? null : Number(row.beta),
        marketCap: row.market_cap == null ? null : Number(row.market_cap),
        freeFloat: row.free_float == null ? null : Number(row.free_float),
        fcfYield: row.fcf_yield == null ? null : Number(row.fcf_yield),
        evEbitda: row.ev_ebitda == null ? null : Number(row.ev_ebitda),
        roic: row.roic == null ? null : Number(row.roic),
        currentRatio: row.current_ratio == null ? null : Number(row.current_ratio),
        epsGrowth: row.eps_growth == null ? null : Number(row.eps_growth),
        fcfGrowth: row.fcf_growth == null ? null : Number(row.fcf_growth),
        grossMargin: row.gross_margin == null ? null : Number(row.gross_margin),
        netMargin: row.net_margin == null ? null : Number(row.net_margin),
        source: this.id,
        retrievedAt,
        completenessScore: Math.round((present / fields.length) * 100),
      };
    });
  }
}
