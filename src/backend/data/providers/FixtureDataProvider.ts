import type { DataProvider, FundamentalSnapshot, MarketPriceRecord } from "./types";

export class FixtureDataProvider implements DataProvider {
  id = "fixture";

  constructor(
    private readonly prices: MarketPriceRecord[] = [],
    private readonly fundamentals: FundamentalSnapshot[] = [],
  ) {}

  async fetchPrices(symbols: string[], from: string, to: string): Promise<MarketPriceRecord[]> {
    const wanted = new Set(symbols.map((s) => s.toUpperCase()));
    return this.prices.filter((r) => wanted.has(r.symbol.toUpperCase()) && r.tradingDate >= from && r.tradingDate <= to);
  }

  async fetchFundamentals(symbols: string[]): Promise<FundamentalSnapshot[]> {
    const wanted = new Set(symbols.map((s) => s.toUpperCase()));
    return this.fundamentals.filter((r) => wanted.has(r.symbol.toUpperCase()));
  }
}

