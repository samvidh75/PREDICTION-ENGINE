import { query } from "../../../db";
import type { DataProvider, FundamentalSnapshot, MarketPriceRecord } from "./types";

export class DatabaseSnapshotProvider implements DataProvider {
  id = "existing-database";

  async fetchPrices(symbols: string[], from: string, to: string): Promise<MarketPriceRecord[]> {
    if (symbols.length === 0) return [];
    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(",");
    const rows = await query(`SELECT symbol, trade_date, open, high, low, close, volume FROM daily_prices WHERE symbol IN (${placeholders}) AND trade_date >= $${symbols.length + 1} AND trade_date <= $${symbols.length + 2} ORDER BY symbol, trade_date`, [...symbols.map((s) => s.toUpperCase()), from, to]);
    const retrievedAt = new Date().toISOString();
    return rows.rows.map((row) => ({
      symbol: String(row.symbol),
      tradingDate: String(row.trade_date),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: row.volume == null ? null : Number(row.volume),
      source: this.id,
      retrievedAt,
      providerRecordId: `${row.symbol}:${row.trade_date}`,
    }));
  }

  async fetchFundamentals(symbols: string[]): Promise<FundamentalSnapshot[]> {
    if (symbols.length === 0) return [];
    const placeholders = symbols.map((_, i) => `$${i + 1}`).join(",");
    const rows = await query(`SELECT symbol, period_end, snapshot_date, pe_ratio, pb_ratio, eps, roe, debt_to_equity, revenue_growth, earnings_growth, operating_margin, net_margin FROM financial_snapshots WHERE symbol IN (${placeholders}) ORDER BY symbol, period_end DESC`, symbols.map((s) => s.toUpperCase()));
    const latest = new Map<string, Record<string, unknown>>();
    for (const row of rows.rows) if (!latest.has(String(row.symbol))) latest.set(String(row.symbol), row);
    const retrievedAt = new Date().toISOString();
    return [...latest.values()].map((row) => {
      const fields = ["pe_ratio", "pb_ratio", "eps", "roe", "debt_to_equity", "revenue_growth", "earnings_growth", "operating_margin", "net_margin"];
      const present = fields.filter((field) => row[field] != null).length;
      return {
        symbol: String(row.symbol),
        fiscalPeriod: String(row.period_end),
        asOfDate: String(row.snapshot_date ?? row.period_end),
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
        operatingMargin: row.operating_margin == null ? null : Number(row.operating_margin),
        netMargin: row.net_margin == null ? null : Number(row.net_margin),
        revenueGrowth: row.revenue_growth == null ? null : Number(row.revenue_growth),
        earningsGrowth: row.earnings_growth == null ? null : Number(row.earnings_growth),
        source: this.id,
        retrievedAt,
        completenessScore: Math.round((present / fields.length) * 100),
      };
    });
  }
}

