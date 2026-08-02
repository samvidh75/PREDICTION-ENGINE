// src/services/personalization/PersonalisationEngine.ts
import { BehaviourCoordinator } from '../behavior/BehaviourCoordinator';
import { RegisteredStock, StockRegistry } from '../stocks/StockRegistry';

export class PersonalisationEngine {
  public static getSuggestedStocks(): RegisteredStock[] {
    const activeSector = BehaviourCoordinator.getMostActiveSector();
    const recentlyViewed = BehaviourCoordinator.getRecentlyViewedSymbols();

    const allStocks = StockRegistry.getAllStocks();
    
    // Filter out stocks already recently viewed, prioritize the most active sector
    const suggestions = allStocks.filter(
      (s) => !recentlyViewed.includes(s.symbol)
    );

    const sectorMatches = suggestions.filter((s) => s.sector === activeSector);
    if (sectorMatches.length >= 3) {
      return sectorMatches.slice(0, 4);
    }

    // Fallback to top capitalization stocks if not enough sector matches
    return suggestions.slice(0, 4);
  }

  public static getPersonalizedGreeting(): string {
    const activeSector = BehaviourCoordinator.getMostActiveSector();

    if (activeSector && activeSector !== 'General') {
      return `Research context is focused on ${activeSector}.`;
    }
    return 'Research context is ready.';
  }
}
