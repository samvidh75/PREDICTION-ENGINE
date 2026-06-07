export type GlobalMarketMood = 'Bullish' | 'Stable' | 'Bearish' | 'Recovering' | 'Volatile';

class MarketStateCoordinator {
  private activeMood: GlobalMarketMood = 'Bullish';
  private moodListeners: Set<(mood: GlobalMarketMood) => void> = new Set();

  public getMood(): GlobalMarketMood {
    return this.activeMood;
  }

  public setMood(mood: GlobalMarketMood): void {
    if (mood !== this.activeMood) {
      this.activeMood = mood;
      this.moodListeners.forEach(listener => listener(mood));
    }
  }

  public subscribeMood(callback: (mood: GlobalMarketMood) => void): () => void {
    this.moodListeners.add(callback);
    return () => {
      this.moodListeners.delete(callback);
    };
  }
}

export const marketStateCoordinator = new MarketStateCoordinator();
export default marketStateCoordinator;
