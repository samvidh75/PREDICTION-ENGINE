import { MarketDataCache } from "./MarketDataCache";
import { type IndianStock } from "../stocks/StockMetadata";

export class StockCacheManager {
  static cacheStock(ticker: string, stock: IndianStock): void {
    // Save to L1 Memory Cache
    MarketDataCache.setL1(ticker, stock);

    // Save to L2 Session Cache
    try {
      MarketDataCache.setL2(ticker, JSON.stringify(stock));
    } catch {
      // Quiet fail in server/restricted contexts
    }
  }

  static getCachedStock(ticker: string): IndianStock | null {
    // Try L1
    const l1 = MarketDataCache.getL1(ticker);
    if (l1) return l1;

    // Try L2
    const l2Str = MarketDataCache.getL2(ticker);
    if (l2Str) {
      try {
        const stock = JSON.parse(l2Str) as IndianStock;
        MarketDataCache.setL1(ticker, stock);
        return stock;
      } catch {
        return null;
      }
    }

    return null;
  }
}
