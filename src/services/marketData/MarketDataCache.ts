import { type IndianStock } from "../stocks/StockMetadata";

export class MarketDataCache {
  private static l1Cache = new Map<string, IndianStock>();

  static getL1(ticker: string): IndianStock | null {
    return this.l1Cache.get(ticker.toUpperCase()) || null;
  }

  static setL1(ticker: string, stock: IndianStock): void {
    this.l1Cache.set(ticker.toUpperCase(), stock);
  }

  static getL2(ticker: string): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(`ss_l2_cache_${ticker.toUpperCase()}`);
  }

  static setL2(ticker: string, data: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(`ss_l2_cache_${ticker.toUpperCase()}`, data);
  }

  static clear(): void {
    this.l1Cache.clear();
  }
}
