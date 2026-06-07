import { MarketMood, MarketMoodEngine } from "./MarketMoodEngine";

export type GlowState = "default" | "hover" | "focus" | "active";

export class GlowCoordinator {
  /**
   * Section 156 specifications:
   * Hover: Increase glow: 10%
   * Focus: Increase glow: 18%
   * Active: Increase glow: 25%
   * Never exceed: 35%
   * We treat these increments as absolute opacity additions (e.g. +0.10) to the
   * base mood glow, capped at a maximum opacity of 0.35 (35%).
   */
  static getGlowOpacity(state: GlowState, baseOpacity: number): number {
    let increment = 0;
    switch (state) {
      case "hover":
        increment = 0.10;
        break;
      case "focus":
        increment = 0.18;
        break;
      case "active":
        increment = 0.25;
        break;
      case "default":
      default:
        increment = 0;
        break;
    }
    return Math.min(baseOpacity + increment, 0.35);
  }

  static getGlowColor(mood: MarketMood, state: GlowState = "default"): string {
    let rgb = "87, 185, 255"; // Stable fallback
    let baseOpacity = 0.12;

    switch (mood) {
      case "Bullish":
        rgb = "0, 209, 122";
        baseOpacity = 0.16;
        break;
      case "Bearish":
        rgb = "255, 91, 110";
        baseOpacity = 0.12;
        break;
      case "Recovering":
        rgb = "0, 224, 155";
        baseOpacity = 0.12;
        break;
      case "Volatile":
        rgb = "255, 179, 71";
        baseOpacity = 0.12;
        break;
      case "Stable":
      default:
        rgb = "87, 185, 255";
        baseOpacity = 0.12;
        break;
    }

    const targetOpacity = this.getGlowOpacity(state, baseOpacity);
    return `rgba(${rgb}, ${targetOpacity})`;
  }
}
