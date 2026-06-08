export type MarketMood = "Bullish" | "Bearish" | "Stable" | "Recovering" | "Volatile";

export type MoodVisualConfig = {
  accentColor: string;
  glowColor: string;
  atmosphereColor?: string;
};

export class MarketMoodEngine {
  private static currentMood: MarketMood = "Stable";

  static setMood(mood: MarketMood): void {
    this.currentMood = mood;
  }

  static getMood(): MarketMood {
    return this.currentMood;
  }

  /**
   * Section 151 specs:
   * Bullish: Accent #00D17A, Glow rgba(0,209,122,0.16), Atmosphere rgba(0,209,122,0.03)
   * Stable: Accent #57B9FF, Glow rgba(87,185,255,0.12)
   * Bearish: Accent #FF5B6E, Glow rgba(255,91,110,0.12)
   * Recovering: Accent #00E09B
   * Volatile: Accent #FFB347
   */
  static getVisualConfig(mood: MarketMood): MoodVisualConfig {
    switch (mood) {
      case "Bullish":
        return {
          accentColor: "#00D17A",
          glowColor: "rgba(0, 209, 122, 0.16)",
          atmosphereColor: "rgba(0, 209, 122, 0.03)"
        };
      case "Bearish":
        return {
          accentColor: "#FF5B6E",
          glowColor: "rgba(255, 91, 110, 0.12)",
          atmosphereColor: "rgba(255, 91, 110, 0.03)"
        };
      case "Recovering":
        return {
          accentColor: "#00E09B",
          glowColor: "rgba(0, 224, 155, 0.12)",
          atmosphereColor: "rgba(0, 224, 155, 0.02)"
        };
      case "Volatile":
        return {
          accentColor: "#FFB347",
          glowColor: "rgba(255, 179, 71, 0.12)",
          atmosphereColor: "rgba(255, 179, 71, 0.02)"
        };
      case "Stable":
      default:
        return {
          accentColor: "#57B9FF",
          glowColor: "rgba(87, 185, 255, 0.12)",
          atmosphereColor: "rgba(87, 185, 255, 0.02)"
        };
    }
  }
}
