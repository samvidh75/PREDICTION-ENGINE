// src/services/charting/ChartDataCoordinator.ts

export type ChartTimeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "MAX";

export interface ChartPoint {
  time: string;
  price: number;
}

export class ChartDataCoordinator {
  public static generatePoints(timeframe: ChartTimeframe, basePrice: number): ChartPoint[] {
    let count = 30;
    let step = 1;
    
    switch (timeframe) {
      case "1D": count = 24; step = 0.5; break;
      case "1W": count = 7; step = 1; break;
      case "1M": count = 30; step = 2; break;
      case "3M": count = 90; step = 5; break;
      case "6M": count = 180; step = 8; break;
      case "1Y": count = 250; step = 12; break;
      case "3Y": count = 360; step = 25; break;
      case "5Y": count = 500; step = 45; break;
      case "MAX": count = 600; step = 60; break;
    }

    const points: ChartPoint[] = [];
    let currentPrice = basePrice * 0.9;

    for (let i = 0; i < count; i++) {
      // Create a deterministic walk
      const rand = Math.sin(i * 0.1) * 2 + Math.cos(i * 0.05) * 1.5;
      currentPrice += rand * (step * 0.1);
      
      const date = new Date();
      date.setDate(date.getDate() - (count - i));
      
      points.push({
        time: date.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
        price: parseFloat(currentPrice.toFixed(2)),
      });
    }

    return points;
  }
}
