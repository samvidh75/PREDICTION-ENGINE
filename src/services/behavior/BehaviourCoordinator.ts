// src/services/behavior/BehaviourCoordinator.ts
import { UserJourneyEngine, UserEvent } from './UserJourneyEngine';

export class BehaviourCoordinator {
  public static getSearchToExploreRatio(): number {
    const searches = UserJourneyEngine.getEventsByType('search').length;
    const explores = UserJourneyEngine.getEventsByType('stock_explore').length;
    if (searches === 0) return 0;
    return parseFloat((explores / searches).toFixed(2));
  }

  public static getMostActiveSector(): string {
    const explores = UserJourneyEngine.getEventsByType('stock_explore');
    const sectors: Record<string, number> = {};
    
    explores.forEach((e) => {
      const sector = e.metadata.sector;
      if (sector) {
        sectors[sector] = (sectors[sector] || 0) + 1;
      }
    });

    let bestSector = 'General';
    let maxCount = 0;
    Object.entries(sectors).forEach(([sec, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestSector = sec;
      }
    });

    return bestSector;
  }

  public static getRecentlyViewedSymbols(): string[] {
    const explores = UserJourneyEngine.getEventsByType('stock_explore');
    // Sort descending by timestamp
    const sorted = [...explores].sort((a, b) => b.timestamp - a.timestamp);
    const symbols = sorted.map((e) => e.metadata.symbol as string).filter(Boolean);
    // Unique list
    return Array.from(new Set(symbols)).slice(0, 5);
  }

  public static getFeatureUsageFrequency(): Record<string, number> {
    const events = UserJourneyEngine.getEvents();
    const frequency: Record<string, number> = {};
    events.forEach((e) => {
      frequency[e.type] = (frequency[e.type] || 0) + 1;
    });
    return frequency;
  }
}
