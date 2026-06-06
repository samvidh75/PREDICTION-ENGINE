/**
 * Engine 4: Momentum Engine
 * Weight: 15%
 * 
 * Powered by: Stock Indicators (DaveSkender)
 * Inputs: RSI, MACD, ADX, ATR, Trend Strength, Relative Strength, Bollinger Width
 * 
 * Converts technical indicators into a unified Momentum Score.
 * Higher score = stronger bullish momentum.
 * 
 * Raw indicators are NOT exposed directly.
 * They are converted into sub-scores and then into the Momentum Score.
 */

import { EngineInputs, MomentumEngineOutput, clampScore, weightedAverage } from '../types';

export class MomentumEngine {
  evaluate(inputs: EngineInputs): MomentumEngineOutput {
    const { features, historical } = inputs;

    // ── Sub-score 1: RSI Score ───────────────────────────────────────
    let rsiScore = 50;
    const rsi = features.rsi;
    if (rsi !== null) {
      if (rsi >= 55 && rsi <= 65) rsiScore = 90;
      else if (rsi >= 50 && rsi < 55) rsiScore = 75;
      else if (rsi > 65 && rsi <= 70) rsiScore = 65;
      else if (rsi > 70 && rsi <= 75) rsiScore = 40;
      else if (rsi > 75) rsiScore = 20;
      else if (rsi >= 40 && rsi < 50) rsiScore = 50;
      else if (rsi >= 30 && rsi < 40) rsiScore = 35;
      else if (rsi < 30) rsiScore = 25;
    }

    if (historical?.featureHistory && historical.featureHistory.length >= 5) {
      const recentRsi = historical.featureHistory.slice(-5);
      const rsiValues = recentRsi.map(h => h.rsi).filter(r => r !== null);
      const rsiTrend = this.linearTrend(rsiValues.map((v, i) => ({ x: i, y: v })));
      if (rsiTrend > 0.02 && rsi && rsi >= 45 && rsi <= 65) {
        rsiScore = Math.min(95, rsiScore + 10);
      }
    }

    // ── Sub-score 2: MACD Score ─────────────────────────────────────
    let macdScore = 50;
    const macdHist = features.macdHistogram;
    const macd = features.macd;
    const macdSig = features.macdSignal;

    if (macd !== null && macdSig !== null) {
      const macdDiff = macd - macdSig;
      if (macdDiff > 0 && macdHist !== null && macdHist > 0) {
        macdScore = 75;
        if (macdDiff > macdSig * 0.05) macdScore = 85;
      } else if (macdDiff > 0 && macdHist !== null && macdHist <= 0) {
        macdScore = 55;
      } else if (macdDiff <= 0 && macdHist !== null && macdHist < 0) {
        macdScore = 25;
      } else {
        macdScore = 45;
      }
    } else if (macdHist !== null) {
      macdScore = clampScore(50 + macdHist * 2);
    }

    // ── Sub-score 3: ADX Score ──────────────────────────────────────
    let adxScore = 50;
    const adx = features.adx;
    if (adx !== null) {
      if (adx >= 40) adxScore = 80;
      else if (adx >= 30) adxScore = 70;
      else if (adx >= 25) adxScore = 60;
      else if (adx >= 20) adxScore = 45;
      else adxScore = 30;
    }

    // ── Sub-score 4: Trend Strength Score ───────────────────────────
    let trendStrengthScore = 50;
    const trendStrength = features.trendStrength;
    if (trendStrength !== null) {
      if (trendStrength >= 0.05) trendStrengthScore = 90;
      else if (trendStrength >= 0.02) trendStrengthScore = 75;
      else if (trendStrength >= 0) trendStrengthScore = 55;
      else if (trendStrength >= -0.02) trendStrengthScore = 35;
      else if (trendStrength >= -0.05) trendStrengthScore = 20;
      else trendStrengthScore = 10;
    }

    // ── Sub-score 5: Relative Strength Score ────────────────────────
    let relativeStrengthScore = 50;
    const relativeStrength = features.relativeStrength;
    if (relativeStrength !== null && Number.isFinite(relativeStrength)) {
      if (relativeStrength >= 0.20) relativeStrengthScore = 95;
      else if (relativeStrength >= 0.10) relativeStrengthScore = 85;
      else if (relativeStrength >= 0.03) relativeStrengthScore = 70;
      else if (relativeStrength >= -0.03) relativeStrengthScore = 50;
      else if (relativeStrength >= -0.10) relativeStrengthScore = 35;
      else relativeStrengthScore = 15;
    }

    // ── Sub-score 6: Volatility Regime Score ────────────────────────
    let volatilityRegimeScore = 50;
    const bollingerWidth = features.bollingerWidth;
    if (bollingerWidth !== null && Number.isFinite(bollingerWidth) && bollingerWidth >= 0) {
      if (bollingerWidth <= 0.03) volatilityRegimeScore = 75;
      else if (bollingerWidth <= 0.07) volatilityRegimeScore = 85;
      else if (bollingerWidth <= 0.12) volatilityRegimeScore = 70;
      else if (bollingerWidth <= 0.20) volatilityRegimeScore = 50;
      else if (bollingerWidth <= 0.30) volatilityRegimeScore = 30;
      else volatilityRegimeScore = 15;
    }

    const momentumScore = weightedAverage([
      { score: rsiScore, weight: 4 },
      { score: macdScore, weight: 4 },
      { score: relativeStrengthScore, weight: 2 },
    ]);

    const trendScore = weightedAverage([
      { score: adxScore, weight: 4 },
      { score: trendStrengthScore, weight: 6 },
    ]);

    let volatilityScore = 50;
    const vol = features.volatility;
    const atr = features.atr;
    if (vol !== null) {
      const mappedVol = clampScore(100 - vol * 150);
      let mappedAtr = 50;
      if (atr !== null) {
        mappedAtr = clampScore(100 - (atr / 100) * 1000);
      }
      volatilityScore = weightedAverage([
        { score: mappedVol, weight: 5 },
        { score: mappedAtr, weight: 3 },
        { score: volatilityRegimeScore, weight: 2 },
      ]);
    } else if (bollingerWidth !== null) {
      volatilityScore = volatilityRegimeScore;
    }

    const compositeScore = weightedAverage([
      { score: momentumScore, weight: 5 },
      { score: trendScore, weight: 3 },
      { score: volatilityScore, weight: 2 },
    ]);

    const commentary = this.generateCommentary(compositeScore, features);

    return {
      score: compositeScore,
      momentumScore,
      trendScore,
      volatilityScore,
      relativeStrengthScore,
      volatilityRegimeScore,
      commentary,
    };
  }

  /** Simple linear trend slope */
  private linearTrend(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;
    return (n * sumXY - sumX * sumY) / denominator;
  }

  private generateCommentary(score: number, f: EngineInputs['features']): string {
    const hasData = f.rsi !== null || f.macd !== null || f.adx !== null || f.relativeStrength !== null || f.bollingerWidth !== null;
    if (!hasData) return 'Insufficient technical data. Score reflects neutral baseline.';

    if (score >= 75) {
      return 'Strong positive momentum. Multiple technical indicators confirm constructive price trends.';
    }

    if (score >= 60) {
      return 'Constructive momentum. Technical structure supports a positive bias with healthy trend development.';
    }

    if (score >= 45) {
      return 'Neutral momentum. Technical indicators show mixed signals with no dominant direction.';
    }

    if (score >= 30) {
      return 'Weakening momentum. Technical structure suggests declining trend strength.';
    }

    return 'Unhealthy momentum profile. Technical indicators point to sustained downside pressure.';
  }
}

export const momentumEngine = new MomentumEngine();
