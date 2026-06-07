import { COLOUR_TOKENS } from "./ColourTokenRegistry";
import { MarketMood, MarketMoodEngine, MoodVisualConfig } from "./MarketMoodEngine";
import { SurfaceConfig, SurfaceCoordinator } from "./SurfaceCoordinator";
import { GlowState, GlowCoordinator } from "./GlowCoordinator";

export class ThemeCoordinator {
  /**
   * Retrieves the global primary and standard color tokens.
   */
  static getGlobalTokens() {
    return COLOUR_TOKENS;
  }

  /**
   * Gets the active market mood.
   */
  static getActiveMood(): MarketMood {
    return MarketMoodEngine.getMood();
  }

  /**
   * Sets the active market mood dynamically.
   */
  static setActiveMood(mood: MarketMood): void {
    MarketMoodEngine.setMood(mood);
  }

  /**
   * Gets the visual configuration (accent, glow, atmosphere) for the current active market mood.
   */
  static getActiveMoodConfig(): MoodVisualConfig {
    const activeMood = this.getActiveMood();
    return MarketMoodEngine.getVisualConfig(activeMood);
  }

  /**
   * Gets the visual configuration for a specific market mood.
   */
  static getMoodConfig(mood: MarketMood): MoodVisualConfig {
    return MarketMoodEngine.getVisualConfig(mood);
  }

  /**
   * Returns standard futuristic card properties (radius, backdrop-blur, etc.).
   */
  static getCardStyle(isMobile: boolean): SurfaceConfig {
    return SurfaceCoordinator.getCardConfig(isMobile);
  }

  /**
   * Calculates a dynamic interactive glow color based on the current active market mood
   * and the component's state (hover, focus, active).
   */
  static getInteractiveGlow(state: GlowState): string {
    const activeMood = this.getActiveMood();
    return GlowCoordinator.getGlowColor(activeMood, state);
  }

  /**
   * Maps a Healthometer status rating directly to its standardized, synchronized color token.
   * Section 152 specifications.
   */
  static getHealthColor(status: "Very Healthy" | "Healthy" | "Stable" | "Weakening" | "Unhealthy"): string {
    switch (status) {
      case "Very Healthy":
        return COLOUR_TOKENS.healthVeryHealthy;
      case "Healthy":
        return COLOUR_TOKENS.healthHealthy;
      case "Stable":
        return COLOUR_TOKENS.healthStable;
      case "Weakening":
        return COLOUR_TOKENS.healthWeakening;
      case "Unhealthy":
        return COLOUR_TOKENS.healthUnhealthy;
      default:
        return COLOUR_TOKENS.healthStable;
    }
  }

  /**
   * Converts a numerical health score (0-100) to its corresponding health category color.
   */
  static getHealthColorByScore(score: number): string {
    if (score >= 90) return this.getHealthColor("Very Healthy");
    if (score >= 75) return this.getHealthColor("Healthy");
    if (score >= 60) return this.getHealthColor("Stable");
    if (score >= 40) return this.getHealthColor("Weakening");
    return this.getHealthColor("Unhealthy");
  }
}
