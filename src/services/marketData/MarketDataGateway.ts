import { type IndianStock } from "../stocks/StockMetadata";
import { MarketDataCache } from "./MarketDataCache";

export class MarketDataGateway {
  /**
   * Retrieves active, cached, or real-time data for a given stock query.
   */
  static getLatestSnapshot(ticker: string): IndianStock | null {
    const cached = MarketDataCache.getL1(ticker);
    if (cached) return cached;

    // Production rule: this gateway must not manufacture prices, PE, 52-week
    // ranges, market caps, or story text. Consumers should render unavailable
    // states unless live/cache data exists.
    return null;
  }
}

