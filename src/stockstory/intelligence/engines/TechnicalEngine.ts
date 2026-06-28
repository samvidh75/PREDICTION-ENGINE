/**
 * Technical Intelligence Engine
 *
 * Evaluates price-action and volume-derived signals:
 *   1. Trend      — SMA alignment & ADX
 *   2. Momentum   — RSI, MACD, price returns
 *   3. Volatility — ATR, Bollinger bands
 *   4. Volume     — volume ratio & conviction
 *
 * Produces a 0–100 bullish score and pattern-recognition text.
 */

import type { IntelligenceInput, TechnicalEngineOutput } from '../types';
import { clampScore, confidenceWeight, toScoreBand, gradeNumeric } from '../scoring';

export class TechnicalEngine {
  analyze(input: IntelligenceInput): TechnicalEngineOutput {
    const t = input.technicals;

    const trend = this.scoreTrend(t);
    const momentum = this.scoreMomentum(t);
    const volatility = this.scoreVolatility(t);
    const volume = this.scoreVolume(t);

    const rawTotal = trend.points + momentum.points + volatility.points + volume.points;
    const normalised = clampScore(rawTotal);

    const requiredFields = [
      t.rsi, t.macd, t.adx, t.sma50, t.sma200,
      t.momentum1m, t.momentum3m, t.volatility,
      t.volume, t.avgVolume,
    ];
    const dc = confidenceWeight(requiredFields, 10);
    const confidence = Math.min(0.99, dc);

    const pattern = this.recognizePattern(t, trend, momentum, volatility);
    const reasoning = this.buildReasoning(normalised, trend, momentum, volatility, volume);

    return {
      score: normalised,
      trendScore: trend.normalised,
      momentumScore: momentum.normalised,
      volatilityScore: volatility.normalised,
      volumeScore: volume.normalised,
      patternRecognition: pattern,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Trend (0–30) ────────────────────────────────────────────────

  private scoreTrend(t: IntelligenceInput['technicals']): ScoredDim {
    let points = 0;

    // SMA50 vs SMA200 alignment (0–10)
    if (t.sma50 !== null && t.sma200 !== null && t.sma200 !== 0) {
      const ratio = (t.sma50 - t.sma200) / t.sma200;
      if (ratio > 0.05) points += 10;       // golden cross
      else if (ratio > 0) points += 7;       // bullish
      else if (ratio > -0.05) points += 3;   // neutral
      else points += 0;                       // death cross
    }

    // ADX trend strength (0–10)
    if (t.adx !== null) {
      if (t.adx >= 40) points += 10;
      else if (t.adx >= 30) points += 8;
      else if (t.adx >= 25) points += 6;
      else if (t.adx >= 20) points += 4;
      else points += 2;
    }

    // SMA distance (0–10)
    if (t.sma50Distance !== null) {
      if (t.sma50Distance > 5) points += 10;
      else if (t.sma50Distance > 0) points += 6;
      else if (t.sma50Distance > -5) points += 3;
    }

    return { points, normalised: clampScore((points / 30) * 100), raw: points };
  }

  // ── Momentum (0–30) ─────────────────────────────────────────────

  private scoreMomentum(t: IntelligenceInput['technicals']): ScoredDim {
    let points = 0;

    // RSI (0–10)
    if (t.rsi !== null) {
      if (t.rsi >= 60 && t.rsi <= 70) points += 10;  // strong but not overbought
      else if (t.rsi >= 55) points += 8;
      else if (t.rsi >= 50) points += 6;
      else if (t.rsi >= 45) points += 4;
      else if (t.rsi >= 35) points += 2;
    }

    // MACD histogram (0–8)
    if (t.macdHistogram !== null && t.macdSignal !== null) {
      if (t.macdHistogram > 0 && t.macd > t.macdSignal) points += 8;
      else if (t.macdHistogram > 0) points += 5;
      else points += 2;
    }

    // Price returns (0–12)
    if (t.momentum3m !== null) {
      if (t.momentum3m >= 15) points += 12;
      else if (t.momentum3m >= 10) points += 9;
      else if (t.momentum3m >= 5) points += 6;
      else if (t.momentum3m > 0) points += 3;
    }

    return { points, normalised: clampScore((points / 30) * 100), raw: points };
  }

  // ── Volatility (0–20) ───────────────────────────────────────────

  private scoreVolatility(t: IntelligenceInput['technicals']): ScoredDim {
    let points = 20;

    // Bollinger width: very wide = unstable (deduct up to 10)
    if (t.bollingerWidth !== null) {
      if (t.bollingerWidth > 15) points -= 10;
      else if (t.bollingerWidth > 10) points -= 6;
      else if (t.bollingerWidth > 7) points -= 3;
    }

    // Annualised volatility (deduct up to 10)
    if (t.volatility !== null) {
      if (t.volatility > 60) points -= 10;
      else if (t.volatility > 40) points -= 6;
      else if (t.volatility > 25) points -= 3;
    }

    points = Math.max(0, points);
    return { points, normalised: clampScore((points / 20) * 100), raw: points };
  }

  // ── Volume (0–20) ───────────────────────────────────────────────

  private scoreVolume(t: IntelligenceInput['technicals']): ScoredDim {
    let points = 0;

    // Volume ratio vs average (0–12)
    if (t.volumeRatio !== null) {
      if (t.volumeRatio >= 2.0) points += 12;
      else if (t.volumeRatio >= 1.5) points += 9;
      else if (t.volumeRatio >= 1.2) points += 6;
      else if (t.volumeRatio >= 0.8) points += 3;
    }

    // Trend strength via volume confirmation (0–8)
    if (t.trendStrength !== null) {
      if (t.trendStrength >= 70) points += 8;
      else if (t.trendStrength >= 50) points += 5;
      else if (t.trendStrength >= 30) points += 3;
    }

    return { points, normalised: clampScore((points / 20) * 100), raw: points };
  }

  // ── Pattern recognition ─────────────────────────────────────────

  private recognizePattern(
    t: IntelligenceInput['technicals'],
    trend: ScoredDim,
    momentum: ScoredDim,
    volatility: ScoredDim
  ): string {
    if (trend.normalised >= 70 && momentum.normalised >= 70)
      return 'Strong uptrend with bullish momentum confirmation.';
    if (trend.normalised >= 70 && volatility.normalised < 40)
      return 'Stable uptrend with low volatility.';
    if (trend.normalised < 30 && momentum.normalised < 30)
      return 'Weak downtrend with bearish momentum.';
    if (volatility.normalised < 30)
      return 'Elevated volatility suggesting potential reversal or instability.';
    return 'Mixed technical signals — no clear pattern dominance.';
  }

  private buildReasoning(
    score: number,
    trend: ScoredDim,
    momentum: ScoredDim,
    volatility: ScoredDim,
    volume: ScoredDim
  ): string {
    const band = toScoreBand(score);
    const parts: string[] = [];
    if (trend.normalised >= 65) parts.push('trend is bullish');
    else if (trend.normalised >= 40) parts.push('trend is neutral');
    else parts.push('trend is bearish');

    if (momentum.normalised >= 65) parts.push('momentum is positive');
    else if (momentum.normalised >= 40) parts.push('momentum is flat');
    else parts.push('momentum is negative');

    if (volatility.normalised >= 65) parts.push('volatility is low');
    else parts.push('volatility is elevated');

    return `Technical ${band}: ${parts.join('; ')}.`;
  }
}

interface ScoredDim {
  raw: number;
  points: number;
  normalised: number;
}

export const technicalEngine = new TechnicalEngine();
