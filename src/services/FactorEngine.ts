// src/services/FactorEngine.ts
// Production Factor Engine to evaluate factors (Quality, Value, Growth, Momentum, Risk, Sector Strength).
// Outputs FactorScores scaled from 0 to 100.

import { query } from "../db/index";
import { ExplanationEngine } from "./ExplanationEngine";

export interface StockFactorSnapshot {
  symbol: string;
  tradeDate: string;
  qualityFactor: number;
  valueFactor: number;
  growthFactor: number;
  momentumFactor: number;
  riskFactor: number;
  sectorStrengthFactor: number;
  factorScore: number;
  explanations: {
    topPositiveDrivers: string[];
    topNegativeDrivers: string[];
  };
}

export class FactorEngine {
  private explanationEngine = new ExplanationEngine();
  private sectorPromises = new Map<string, Promise<Map<string, number>>>();

  private getSectorMomentumMap(sector: string): Promise<Map<string, number>> {
    let prom = this.sectorPromises.get(sector);
    if (!prom) {
      prom = (async () => {
        const sectorMomentumRes = await query(
          `SELECT dp.trade_date::text as date, AVG((dp.close - dp.open)/dp.open) as avg_return
           FROM daily_prices dp
           JOIN symbols s ON dp.symbol = s.symbol
           WHERE s.sector = $1
           GROUP BY dp.trade_date`,
          [sector]
        );
        const map = new Map<string, number>();
        for (const r of sectorMomentumRes.rows) {
          map.set(r.date, Number(r.avg_return));
        }
        return map;
      })();
      this.sectorPromises.set(sector, prom);
    }
    return prom;
  }

  async calculateAndStoreFactors(symbol: string): Promise<StockFactorSnapshot[]> {
    // 1. Fetch features and prices from DB
    const featuresRes = await query(
      `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date ASC`,
      [symbol]
    );

    const pricesRes = await query(
      `SELECT trade_date::text as date, close, volume FROM daily_prices WHERE symbol = $1 ORDER BY trade_date ASC`,
      [symbol]
    );

    const symbolRes = await query(
      `SELECT sector, industry FROM symbols WHERE symbol = $1`,
      [symbol]
    );

    const financialsRes = await query(
      `SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`,
      [symbol]
    );

    const features = featuresRes.rows;
    const prices = pricesRes.rows;
    const symbolInfo = symbolRes.rows[0] || { sector: "Technology" };
    const financial = financialsRes.rows[0] || { pe_ratio: 25, dividend_yield: 1.5, beta: 1.0, eps: 50 };

    if (features.length === 0 || prices.length === 0) {
      console.warn(`⚠️ Insufficient features/prices for factor generation of ${symbol}`);
      return [];
    }

    const sector = symbolInfo.sector || "Technology";

    // Fetch average market and sector momentum to calculate Sector Strength and Relative factors
    const sectorMomentumRes = await query(
      `SELECT dp.trade_date::text as date, AVG((dp.close - dp.open)/dp.open) as avg_return
       FROM daily_prices dp
       JOIN symbols s ON dp.symbol = s.symbol
       WHERE s.sector = $1
       GROUP BY dp.trade_date`,
      [sector]
    );

    const sectorMomentumMap = new Map<string, number>();
    for (const r of sectorMomentumRes.rows) {
      sectorMomentumMap.set(r.date, Number(r.avg_return));
    }

    const n = features.length;
    const snapshots: StockFactorSnapshot[] = [];

    for (let i = 0; i < n; i++) {
      const feat = features[i];
      const date = feat.trade_date.toISOString().split("T")[0];

      // Find matching price record for calculations
      const priceRec = prices.find(p => p.date === date) || prices[prices.length - 1];
      const close = Number(priceRec.close);

      // ── 1. Quality Factor (Profitability & Safety) ────────────────
      // Base on PE ratio stability, dividend yield, and MA distance safety
      const peScore = financial.pe_ratio > 0 && financial.pe_ratio < 40
        ? 100 - (financial.pe_ratio / 40) * 50
        : financial.pe_ratio > 40 ? 25 : 50;
      const divScore = financial.dividend_yield > 0 ? Math.min(financial.dividend_yield * 15, 100) : 30;
      const rsiTerm = feat.rsi !== null ? (feat.rsi >= 30 && feat.rsi <= 70 ? 80 : 40) : 50;
      const qualityFactor = Math.round(peScore * 0.4 + divScore * 0.3 + rsiTerm * 0.3);

      // ── 2. Value Factor (Undervaluation) ──────────────────────────
      // Lower PE and positive dividend yield represent high value score
      const peValue = financial.pe_ratio > 0
        ? Math.max(10, Math.min(90, 100 - financial.pe_ratio * 1.5))
        : 40;
      const yieldValue = financial.dividend_yield > 0 ? Math.min(90, 30 + financial.dividend_yield * 10) : 40;
      const maDistanceValue = feat.moving_average_distance !== null
        ? Math.max(10, Math.min(90, 50 - Number(feat.moving_average_distance) * 100))
        : 50;
      const valueFactor = Math.round(peValue * 0.5 + yieldValue * 0.2 + maDistanceValue * 0.3);

      // ── 3. Growth Factor (Price & Earnings Expansion) ──────────────
      // Rate of change in momentum, trend strength, and MA distance
      const trendTerm = feat.trend_strength !== null ? Math.min(100, Math.max(0, 50 + Number(feat.trend_strength) * 200)) : 50;
      const momTerm = feat.momentum !== null ? Math.min(100, Math.max(0, 50 + Number(feat.momentum) * 300)) : 50;
      const growthFactor = Math.round(trendTerm * 0.6 + momTerm * 0.4);

      // ── 4. Momentum Factor (Price Trend Velocity) ──────────────────
      // Blend of RSI, MACD Histogram, and 10-day rate of change
      const rsiMom = feat.rsi !== null ? Number(feat.rsi) : 50;
      const macdHistMom = feat.macd_histogram !== null ? Math.min(100, Math.max(0, 50 + Number(feat.macd_histogram) * 5)) : 50;
      const changeMom = feat.momentum !== null ? Math.min(100, Math.max(0, 50 + Number(feat.momentum) * 400)) : 50;
      const momentumFactor = Math.round(rsiMom * 0.3 + macdHistMom * 0.3 + changeMom * 0.4);

      // ── 5. Risk Factor (Safety / Low Volatility) ───────────────────
      // High score means lower risk. Inverse of Volatility, Beta, and ADX strength.
      const volRisk = feat.volatility !== null ? Math.max(10, Math.min(90, 100 - Number(feat.volatility) * 150)) : 50;
      const betaRisk = financial.beta ? Math.max(10, Math.min(90, 100 - financial.beta * 40)) : 50;
      const atrRisk = feat.atr !== null ? Math.max(10, Math.min(90, 100 - (Number(feat.atr) / close) * 1500)) : 50;
      const riskFactor = Math.round(volRisk * 0.4 + betaRisk * 0.4 + atrRisk * 0.2);

      // ── 6. Sector Strength Factor (Industry/Sector Momentum) ───────
      const sectorReturn = sectorMomentumMap.get(date) ?? 0;
      const sectorStrengthFactor = Math.round(Math.min(100, Math.max(0, 50 + sectorReturn * 1000)));

      // ── 7. Overall Composite FactorScore (0-100) ───────────────────
      // Equally weighted average
      const rawScore = (qualityFactor + valueFactor + growthFactor + momentumFactor + riskFactor + sectorStrengthFactor) / 6;
      const factorScore = Math.round(rawScore);

      // ── 8. Explanations (Drivers) ─────────────────────────────────
      const explanationInput = {
        qualityFactor,
        valueFactor,
        growthFactor,
        momentumFactor,
        riskFactor,
        sectorStrengthFactor
      };
      const explanations = this.explanationEngine.generateExplanations(explanationInput);

      const snapshot: StockFactorSnapshot = {
        symbol,
        tradeDate: date,
        qualityFactor,
        valueFactor,
        growthFactor,
        momentumFactor,
        riskFactor,
        sectorStrengthFactor,
        factorScore,
        explanations
      };

      snapshots.push(snapshot);

      // Save to database
      await query(
        `INSERT INTO factor_snapshots (
           symbol, trade_date, quality_factor, value_factor, growth_factor,
           momentum_factor, risk_factor, sector_strength_factor, factor_score, explanations
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (symbol, trade_date) DO UPDATE SET
           quality_factor=$3, value_factor=$4, growth_factor=$5, momentum_factor=$6,
           risk_factor=$7, sector_strength_factor=$8, factor_score=$9, explanations=$10`,
        [
          symbol,
          date,
          qualityFactor,
          valueFactor,
          growthFactor,
          momentumFactor,
          riskFactor,
          sectorStrengthFactor,
          factorScore,
          JSON.stringify(explanations)
        ]
      );
    }

    return snapshots;
  }
}

export const factorEngine = new FactorEngine();
export default factorEngine;
