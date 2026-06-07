// src/services/FeatureImportanceEngine.ts
// Production Feature Importance Engine.
// Analyzes feature relationship with forward stock returns and ranks them by Information Coefficient (IC).

import { query } from "../db/index";

export interface FeatureImportance {
  feature: string;
  correlation: number;
  importance_score: number; // Normalized scale 0-100
  rank: number;
}

export class FeatureImportanceEngine {
  async analyzeFeatureImportance(symbol: string): Promise<FeatureImportance[]> {
    // 1. Fetch feature snapshots and daily prices
    const featuresRes = await query(
      `SELECT trade_date, rsi, macd, adx, atr, momentum, volatility, relative_strength, trend_strength
       FROM feature_snapshots
       WHERE symbol = $1
       ORDER BY trade_date ASC`,
      [symbol]
    );

    const pricesRes = await query(
      `SELECT trade_date::text as date, close
       FROM daily_prices
       WHERE symbol = $1
       ORDER BY trade_date ASC`,
      [symbol]
    );

    const features = featuresRes.rows;
    const prices = pricesRes.rows;

    if (features.length < 50 || prices.length < 50) {
      return [];
    }

    const featureNames = [
      "rsi",
      "macd",
      "adx",
      "atr",
      "momentum",
      "volatility",
      "relative_strength",
      "trend_strength",
    ];

    const dateToIndex = new Map<string, number>();
    prices.forEach((p, idx) => {
      dateToIndex.set(p.trade_date ? p.trade_date.toISOString().split("T")[0] : p.date, idx);
    });

    const lookAhead = 30; // 30-day forward return as targets
    const analysisResults: { feature: string; correlation: number; absCorr: number }[] = [];

    for (const featName of featureNames) {
      const featValues: number[] = [];
      const forwardReturns: number[] = [];

      for (let i = 0; i < features.length; i++) {
        const f = features[i];
        const dateStr = f.trade_date.toISOString().split("T")[0];
        const priceIdx = dateToIndex.get(dateStr);

        if (priceIdx !== undefined && priceIdx + lookAhead < prices.length) {
          const closeToday = Number(prices[priceIdx].close);
          const closeFuture = Number(prices[priceIdx + lookAhead].close);
          const forwardReturn = (closeFuture - closeToday) / closeToday;

          const val = f[featName];
          if (val !== null && val !== undefined) {
            featValues.push(Number(val));
            forwardReturns.push(forwardReturn);
          }
        }
      }

      if (featValues.length < 10) continue;

      const correlation = this.calculateCorrelation(featValues, forwardReturns);
      analysisResults.push({
        feature: this.formatFeatureName(featName),
        correlation: Math.round(correlation * 1000) / 1000,
        absCorr: Math.abs(correlation),
      });
    }

    // Sort by absolute correlation descending
    analysisResults.sort((a, b) => b.absCorr - a.absCorr);

    // Normalize importance scores between 0 and 100 based on absolute correlation
    const maxAbsCorr = analysisResults.length > 0 ? analysisResults[0].absCorr : 1.0;
    const importanceList: FeatureImportance[] = analysisResults.map((item, index) => {
      const score = maxAbsCorr > 0 ? (item.absCorr / maxAbsCorr) * 100 : 50;
      return {
        feature: item.feature,
        correlation: item.correlation,
        importance_score: Math.round(score * 100) / 100,
        rank: index + 1,
      };
    });

    return importanceList;
  }

  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let num = 0;
    let denX = 0;
    let denY = 0;

    for (let i = 0; i < n; i++) {
      const diffX = x[i] - meanX;
      const diffY = y[i] - meanY;
      num += diffX * diffY;
      denX += diffX * diffX;
      denY += diffY * diffY;
    }

    if (denX === 0 || denY === 0) return 0;
    return num / Math.sqrt(denX * denY);
  }

  private formatFeatureName(col: string): string {
    if (col.toLowerCase() === "rsi" || col.toLowerCase() === "macd" || col.toLowerCase() === "adx" || col.toLowerCase() === "atr") {
      return col.toUpperCase();
    }
    return col
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }
}

export const featureImportanceEngine = new FeatureImportanceEngine();
export default featureImportanceEngine;
