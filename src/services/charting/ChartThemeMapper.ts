// src/services/charting/ChartThemeMapper.ts

export interface ChartTheme {
  strokeColor: string;
  gradientStart: string;
  gradientStop: string;
  crosshairColor: string;
  gridColor: string;
}

export class ChartThemeMapper {
  public static mapTheme(mood: "bullish" | "bearish" | "stable"): ChartTheme {
    switch (mood) {
      case "bullish":
        return {
          strokeColor: "#00D17A", // Emerald
          gradientStart: "rgba(0, 209, 122, 0.22)",
          gradientStop: "rgba(0, 209, 122, 0)",
          crosshairColor: "#7CF7D4",
          gridColor: "rgba(255, 255, 255, 0.03)",
        };
      case "bearish":
        return {
          strokeColor: "#FF5B6E", // Crimson
          gradientStart: "rgba(255, 91, 110, 0.22)",
          gradientStop: "rgba(255, 91, 110, 0)",
          crosshairColor: "#FF5B6E",
          gridColor: "rgba(255, 255, 255, 0.03)",
        };
      case "stable":
      default:
        return {
          strokeColor: "#5BA7FF", // Electric blue soft
          gradientStart: "rgba(91, 167, 255, 0.22)",
          gradientStop: "rgba(91, 167, 255, 0)",
          crosshairColor: "#5BA7FF",
          gridColor: "rgba(255, 255, 255, 0.03)",
        };
    }
  }
}
