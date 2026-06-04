// src/services/charting/ChartEngine.ts
import { ChartPoint } from "./ChartDataCoordinator";

export type MarketTrend = "Uptrend" | "Sideways" | "Pullback" | "Recovery";

export interface ChartViewport {
  zoomFactor: number;
  panOffset: number;
}

export class ChartEngine {
  // Translate quantitative patterns to jargon-free visual trends
  public static analyzeTrend(points: ChartPoint[]): { trend: MarketTrend; support: number; resistance: number } {
    if (points.length < 2) {
      return { trend: "Sideways", support: 0, resistance: 0 };
    }

    const prices = points.map((p) => p.price);
    const start = prices[0];
    const end = prices[prices.length - 1];

    let max = -Infinity;
    let min = Infinity;
    for (const p of prices) {
      if (p > max) max = p;
      if (p < min) min = p;
    }

    const netChange = (end - start) / start;

    let trend: MarketTrend = "Sideways";
    if (netChange > 0.05) {
      trend = "Uptrend";
    } else if (netChange < -0.05) {
      trend = "Pullback";
    } else if (end > min + (max - min) * 0.4) {
      trend = "Recovery";
    }

    // Support and resistance
    const support = min * 1.01;
    const resistance = max * 0.99;

    return { trend, support, resistance };
  }

  // Persists the interactive viewport states
  public static getDefaultViewport(): ChartViewport {
    return {
      zoomFactor: 1.0,
      panOffset: 0,
    };
  }
}
