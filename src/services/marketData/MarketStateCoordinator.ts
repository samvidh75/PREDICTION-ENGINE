export type MarketMoodState = "Bullish" | "Bearish" | "Stable" | "Volatile" | "Recovering";

export class MarketStateCoordinator {
  private static currentState: MarketMoodState = "Stable";

  static setMood(state: MarketMoodState): void {
    this.currentState = state;
  }

  static getMood(): MarketMoodState {
    return this.currentState;
  }

  /**
   * Matches the visual lighting glow strength (Section 65 / Section 87 specs).
   */
  static getGlowOpacity(state: MarketMoodState): number {
    switch (state) {
      case "Bullish":
        return 0.15; // 15%
      case "Bearish":
        return 0.12; // 12%
      case "Stable":
      default:
        return 0.10; // 10%
    }
  }

  /**
   * Matches Section 87 state color codes.
   */
  static getAmbientLightingColor(state: MarketMoodState): string {
    switch (state) {
      case "Bullish":
        return "rgba(0, 209, 122, 0.08)";
      case "Bearish":
        return "rgba(255, 91, 110, 0.06)";
      case "Stable":
      default:
        return "rgba(87, 185, 255, 0.06)";
    }
  }
}
