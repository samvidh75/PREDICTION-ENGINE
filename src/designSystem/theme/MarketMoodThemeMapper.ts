import { marketStateCoordinator, GlobalMarketMood } from '../../services/realtime/MarketStateCoordinator';
import { ThemeCoordinator } from './ThemeCoordinator';
import { MarketMood } from './MarketMoodEngine';

export class MarketMoodThemeMapper {
  private static unsubscribe: (() => void) | null = null;

  /**
   * Initializes real-time sync between the MarketStateCoordinator
   * and the visual ThemeCoordinator.
   */
  public static initialize(): void {
    if (this.unsubscribe) return;

    this.unsubscribe = marketStateCoordinator.subscribeMood((mood: GlobalMarketMood) => {
      // Map global market state type directly to theme mood type
      const targetMood: MarketMood = mood;
      ThemeCoordinator.setActiveMood(targetMood);
      
      // Dispatch popstate/urlchange or custom event to notify all UI layers of the atmospheric theme change
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ss:themeUpdated', { detail: { mood } }));
      }
    });
  }

  public static terminate(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}

export default MarketMoodThemeMapper;
