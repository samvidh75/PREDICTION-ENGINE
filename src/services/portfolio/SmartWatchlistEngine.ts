// src/services/portfolio/SmartWatchlistEngine.ts
import { StockRegistry, RegisteredStock } from "../stocks/StockRegistry";
import { rangeProximity } from "../dna/dnaInputs";

export interface SmartWatchlist {
  name: string;
  description: string;
  tickers: string[];
}

export class SmartWatchlistEngine {
  public static getSmartWatchlists(): SmartWatchlist[] {
    const all = StockRegistry.getAllStocks();

    const highHealth = all
      .filter((s) => s.healthStatus === "veryHealthy")
      .map((s) => s.symbol)
      .slice(0, 5);

    const improving = all
      .filter((s) => s.healthStatus === "healthy")
      .map((s) => s.symbol)
      .slice(0, 5);

    const momentumLeaders = all
      .filter((s) => {
        const proximity = rangeProximity(s);
        return proximity !== null && proximity > 0.75;
      })
      .map((s) => s.symbol)
      .slice(0, 5);

    const sectorLeaders = all
      .filter((s) => typeof s.peRatio === "number" && s.peRatio > 0 && s.peRatio < 20)
      .map((s) => s.symbol)
      .slice(0, 5);

    const turnarounds = all
      .filter((s) => {
        const proximity = rangeProximity(s);
        return proximity !== null && proximity >= 0.25 && proximity <= 0.50; // base formation
      })
      .map((s) => s.symbol)
      .slice(0, 5);

    return [
      { name: "High Health", description: "Companies exhibiting prime structural health scores.", tickers: highHealth },
      { name: "Improving", description: "Companies recovering steady operational margins.", tickers: improving },
      { name: "Momentum Leaders", description: "Stocks breaking out of long-term base consolidation.", tickers: momentumLeaders },
      { name: "Sector Leaders", description: "Prime corporate leaders offering supportive valuations.", tickers: sectorLeaders },
      { name: "Turnaround Candidates", description: "Assets forming stable accumulation bases.", tickers: turnarounds },
    ];
  }
}
