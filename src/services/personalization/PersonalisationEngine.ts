// src/services/personalization/PersonalisationEngine.ts
import { BehaviourCoordinator } from '../behavior/BehaviourCoordinator';
import { RegisteredStock, StockRegistry } from '../stocks/StockRegistry';

export class PersonalisationEngine {
  public static getSuggestedStocks(): RegisteredStock[] {
    const activeSector = BehaviourCoordinator.getMostActiveSector();
    const recentlyViewed = BehaviourCoordinator.getRecentlyViewedSymbols();

    const allStocks = StockRegistry.getAllStocks();
    
    // Filter out stocks already recently viewed, prioritize the most active sector
    let suggestions = allStocks.filter(
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
    const hour = new Date().getHours();
    const activeSector = BehaviourCoordinator.getMostActiveSector();
    
    let greeting = 'Good day';
    if (hour < 12) greeting = 'Good morning';
    else if (hour < 18) greeting = 'Good afternoon';
    else greeting = 'Good evening';

    if (activeSector && activeSector !== 'General') {
      return `${greeting}! Markets are active. Checking trends in ${activeSector} for you.`;
    }
    return `${greeting}! Explore your investment space today.`;
  }
}
