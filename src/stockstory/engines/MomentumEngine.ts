/**
 * Engine 4: Momentum Engine
 * Weight: 15%
 * 
 * Powered by: Stock Indicators (DaveSkender)
 * Inputs: RSI, MACD, ADX, ATR, Trend Strength
 * 
 * Converts technical indicators into a unified Momentum Score.
 * Higher score = stronger bullish momentum.
 * 
 * Raw indicators (RSI, MACD, ADX, ATR) are NOT exposed directly.
 * They are converted into sub-scores and then into the Momentum Score.
 */

import { EngineInputs, MomentumEngineOutput, clampScore, weightedAverage } from '../types';

export class MomentumEngine {
  evaluate(inputs: EngineInputs): MomentumEngineOutput {
    const { features, historical } = inputs;

    // ── Sub-score 1: RSI Score (converted from raw RSI) ─────────────
    // RSI 50-70 = bullish zone (optimal), 30-50 = recovery, <30 = oversold, >70 = overbought
    let rsiScore = 50;
    const rsi = features.rsi;
    if (rsi !== null) {
      if (rsi >= 55 && rsi <= 65) rsiScore = 90;       // strong bullish without overbought
      else if (rsi >= 50 && rsi < 55) rsiScore = 75;    // mild bullish
      else if (rsi > 65 && rsi <= 70) rsiScore = 65;    // approaching overbought
      else if (rsi > 70 && rsi <= 75) rsiScore = 40;    // overbought — caution
      else if (rsi > 75) rsiScore = 20;                  // extreme overbought
      else if (rsi >= 40 && rsi < 50) rsiScore = 50;    // neutral-weak
      else if (rsi >= 30 && rsi < 40) rsiScore = 35;    // oversold — potential reversal
      else if (rsi < 30) rsiScore = 25;                   // extreme oversold
    }

    // Detect RSI divergence using historical data
    if (historical?.featureHistory && historical.featureHistory.length >= 5) {
      const recentRsi = historical.featureHistory.slice(-5);
      const rsiValues = recentRsi.map(h => h.rsi).filter(r => r !== null);
      const rsiTrend = this.linearTrend(rsiValues.map((v, i) => ({ x: i, y: v })));
      if (rsiTrend > 0.02 && rsi && rsi >= 45 && rsi <= 65) {
        rsiScore = Math.min(95, rsiScore + 10); // rising RSI in healthy zone = strong
      }
    }

    // ── Sub-score 2: MACD Score (converted from MACD histogram) ────
    let macdScore = 50;
    const macdHist = features.macdHistogram;
    const macd = features.macd;
    const macdSig = features.macdSignal;

    if (macd !== null && macdSig !== null) {
      const macdDiff = macd - macdSig;
      if (macdDiff > 0 && macdHist !== null && macdHist > 0) {
        // Bullish: MACD above signal, histogram positive
        macdScore = 75;
        if (macdDiff > macdSig * 0.05) macdScore = 85; // strong bullish
      } else if (macdDiff > 0 && macdHist !== null && macdHist <= 0) {
        macdScore = 55; // MACD above signal but histogram weakening
      } else if (macdDiff <= 0 && macdHist !== null && macdHist < 0) {
        macdScore = 25; // Bearish
      } else {
        macdScore = 45; // Mixed signals
      }
    } else if (macdHist !== null) {
      macdScore = clampScore(50 + macdHist * 2);
    }

    // ── Sub-score 3: ADX Score (trend strength direction) ──────────
    let adxScore = 50;
    const adx = features.adx;
    if (adx !== null) {
      // ADX measures trend strength (not direction). Strong trend + bullish MACD/RSI = good.
      if (adx >= 40) adxScore = 80;       // very strong trend
      else if (adx >= 30) adxScore = 70;   // strong trend
      else if (adx >= 25) adxScore = 60;   // trending
      else if (adx >= 20) adxScore = 45;   // weak trend
      else adxScore = 30;                   // trendless/ranging
    }

    // ── Sub-score 4: Trend Strength Score ───────────────────────────
    let trendStrengthScore = 50;
    const trendStrength = features.trendStrength;
    if (trendStrength !== null) {
      // trendStrength is a composite: (EMA20-EMA50)/Close * (1 + ADX/100)
      if (trendStrength >= 0.05) trendStrengthScore = 90;
      else if (trendStrength >= 0.02) trendStrengthScore = 75;
      else if (trendStrength >= 0) trendStrengthScore = 55;
      else if (trendStrength >= -0.02) trendStrengthScore = 35;
      else if (trendStrength >= -0.05) trendStrengthScore = 20;
      else trendStrengthScore = 10;
    }

    // ── Converted Sub-score 1: Momentum Score ───────────────────────
    // blend of RSI and MACD
    const momentumScore = weightedAverage([
      { score: rsiScore, weight: 5 },
      { score: macdScore, weight: 5 },
    ]);

    // ── Converted Sub-score 2: Trend Score ──────────────────────────
    // blend of ADX and Trend Strength
    const trendScore = weightedAverage([
      { score: adxScore, weight: 4 },
      { score: trendStrengthScore, weight: 6 },
    ]);

    // ── Converted Sub-score 3: Volatility Score ─────────────────────
    // derived from Volatility & ATR (lower volatility/ATR = higher stability score)
    let volatilityScore = 50;
    const vol = features.volatility;
    const atr = features.atr;
    if (vol !== null) {
      const mappedVol = clampScore(100 - vol * 150);
      let mappedAtr = 50;
      if (atr !== null) {
        // ATR relative adjustment
        mappedAtr = clampScore(100 - (atr / 100) * 1000);
      }
      volatilityScore = weightedAverage([
        { score: mappedVol, weight: 6 },
        { score: mappedAtr, weight: 4 },
      ]);
    }

    // ── Overall Momentum Engine composite score ─────────────────────
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
    const hasData = f.rsi !== null || f.macd !== null || f.adx !== null;
    if (!hasData) return 'Insufficient technical data. Score reflects neutral baseline.';

    if (score >= 75) {
      return 'Strong bullish momentum. Multiple technical indicators confirm positive price trends with institutional follow-through.';
    }

    if (score >= 60) {
      return 'Constructive momentum. Technical structure supports a bullish bias with healthy trend development.';
    }

    if (score >= 45) {
      return 'Neutral momentum. Technical indicators show mixed signals — neither strong bullish conviction nor bearish pressure.';
    }

    if (score >= 30) {
      return 'Weakening momentum. Deteriorating technical structure suggests declining trend strength. Caution warranted.';
    }

    return 'Bearish momentum. Technical indicators point to sustained downside pressure and weak trend structure.';
  }
}

export const momentumEngine = new MomentumEngine();
