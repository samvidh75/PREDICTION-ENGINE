// src/services/portfolio/PersonalDiscoveryEngine.ts
import { StockRegistry, RegisteredStock } from "../stocks/StockRegistry";
import { UserHolding } from "./PortfolioEngine";

export class PersonalDiscoveryEngine {
  public static getPersonalSuggestions(holdings: UserHolding[]): RegisteredStock[] {
    const all = StockRegistry.getAllStocks();
    if (holdings.length === 0) return all.slice(0, 3);

    const userSectors = holdings.map((h) => h.sector);
    const userSymbols = holdings.map((h) => h.symbol);

    // Find stocks in similar sectors that the user does not hold yet
    const similar = all.filter(
      (s) => userSectors.includes(s.sector) && !userSymbols.includes(s.symbol)
    );

    // If nothing, fallback to high health stocks
    if (similar.length === 0) {
      return all.filter((s) => s.healthStatus === "veryHealthy").slice(0, 3);
    }

    return similar.slice(0, 3);
  }
}
