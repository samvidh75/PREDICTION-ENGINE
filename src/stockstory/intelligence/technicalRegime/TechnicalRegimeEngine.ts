/**
 * Technical Regime Engine
 *
 * Classifies the technical regime of a stock:
 * - trending, rangebound, volatile, overextended, accumulation, distribution
 *
 * Uses technical indicators from IntelligenceInput to determine
 * the price structure and momentum context — not buy/sell signals.
 */

import type { IntelligenceInput } from '../../types';

export interface TechnicalRegimeReport {
  symbol: string;
  generatedAt: string;

  regime: TechnicalRegime;
  regimeConfidence: number;          // 0-1
  regimeDescription: string;

  trend: TrendAnalysis;
  momentum: MomentumAnalysis;
  volatility: VolatilityAnalysis;
  volume: VolumeAnalysis;

  confluence: ConfluenceAssessment;
  summary: string;
}

export type TechnicalRegime =
  'strong_uptrend' | 'uptrend' | 'rangebound' | 'downtrend' | 'strong_downtrend' |
  'overextended_up' | 'overextended_down' | 'volatile' | 'accumulation' | 'distribution' |
  'insufficient_data';

export interface TrendAnalysis {
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  trendStrength: 'strong' | 'moderate' | 'weak' | 'none';
  description: string;
}

export interface MomentumAnalysis {
  rsi: number | null;
  rsiInterpretation: string;
  macdSignal: 'bullish' | 'bearish' | 'neutral' | 'unknown';
  momentumBias: 'positive' | 'negative' | 'neutral' | 'unknown';
}

export interface VolatilityAnalysis {
  beta: number | null;
  standardDeviation: number | null;
  volatilityLevel: 'high' | 'moderate' | 'low' | 'unknown';
  description: string;
}

export interface VolumeAnalysis {
  /** Volume relative to average */
  relativeVolume: number | null;
  volumeInterpretation: string;
}

export interface ConfluenceAssessment {
  /** How many indicators point in same direction */
  agreementCount: number;
  totalIndicators: number;
  agreementRatio: number;           // 0-1
  description: string;
}

export class TechnicalRegimeEngine {
  analyze(input: IntelligenceInput): TechnicalRegimeReport {
    const t = input.technicals;
    const trend = this.analyzeTrend(t);
    const momentum = this.analyzeMomentum(t);
    const volatility = this.analyzeVolatility(t);
    const volume = this.analyzeVolume(t);
    const confluence = this.assessConfluence(trend, momentum, volatility, volume);
    const { regime, confidence } = this.classifyRegime(trend, momentum, volatility, volume, confluence);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      regime,
      regimeConfidence: confidence,
      regimeDescription: this.describeRegime(regime),
      trend,
      momentum,
      volatility,
      volume,
      confluence,
      summary: this.buildSummary(regime, confluence),
    };
  }

  private analyzeTrend(t: IntelligenceInput['technicals']): TrendAnalysis {
    const sma20 = t.sma20 ?? null;
    const sma50 = t.sma50 ?? null;
    const sma200 = t.sma200 ?? null;

    let trendStrength: TrendAnalysis['trendStrength'] = 'none';
    let description = 'Trend data incomplete.';

    if (sma20 !== null && sma50 !== null) {
      if (sma20 > sma50 * 1.02) { trendStrength = 'strong'; description = 'Price above short and medium-term averages.'; }
      else if (sma20 > sma50) { trendStrength = 'moderate'; description = 'Price above medium-term average.'; }
      else if (sma20 < sma50 * 0.98) { trendStrength = 'strong'; description = 'Price below short and medium-term averages.'; }
      else { trendStrength = 'weak'; description = 'Price near moving averages — no clear trend.'; }
    }

    return { sma20, sma50, sma200, trendStrength, description };
  }

  private analyzeMomentum(t: IntelligenceInput['technicals']): MomentumAnalysis {
    const rsi = t.rsi ?? null;
    let rsiInterpretation = 'RSI data unavailable.';
    let macdSignal: MomentumAnalysis['macdSignal'] = 'unknown';
    let momentumBias: MomentumAnalysis['momentumBias'] = 'unknown';

    if (rsi !== null) {
      if (rsi > 70) rsiInterpretation = `RSI ${rsi} — overextended territory.`;
      else if (rsi > 60) rsiInterpretation = `RSI ${rsi} — positive momentum.`;
      else if (rsi > 40) rsiInterpretation = `RSI ${rsi} — neutral zone.`;
      else if (rsi > 30) rsiInterpretation = `RSI ${rsi} — negative momentum.`;
      else rsiInterpretation = `RSI ${rsi} — oversold territory.`;
    }

    // MACD approximation from available data
    if (t.sma20 !== null && t.sma50 !== null) {
      const diff = (t.sma20 - t.sma50) / t.sma50 * 100;
      if (diff > 1) { macdSignal = 'bullish'; momentumBias = 'positive'; }
      else if (diff < -1) { macdSignal = 'bearish'; momentumBias = 'negative'; }
      else { macdSignal = 'neutral'; momentumBias = 'neutral'; }
    }

    return { rsi, rsiInterpretation, macdSignal, momentumBias };
  }

  private analyzeVolatility(t: IntelligenceInput['technicals']): VolatilityAnalysis {
    const beta = t.beta ?? null;
    const sd = t.standardDeviation ?? null;

    let level: VolatilityAnalysis['volatilityLevel'] = 'unknown';
    let description = 'Volatility data unavailable.';

    if (beta !== null) {
      if (beta > 1.3) { level = 'high'; description = `Beta ${beta} — higher than market.`; }
      else if (beta > 0.8) { level = 'moderate'; description = `Beta ${beta} — in line with market.`; }
      else { level = 'low'; description = `Beta ${beta} — lower than market.`; }
    } else if (sd !== null) {
      if (sd > 3) { level = 'high'; description = 'Elevated daily volatility.'; }
      else if (sd > 1.5) { level = 'moderate'; description = 'Moderate daily volatility.'; }
      else { level = 'low'; description = 'Lower daily volatility.'; }
    }

    return { beta, standardDeviation: sd, volatilityLevel: level, description };
  }

  private analyzeVolume(t: IntelligenceInput['technicals']): VolumeAnalysis {
    const rv = t.relativeVolume ?? null;
    return {
      relativeVolume: rv,
      volumeInterpretation: rv !== null
        ? rv > 1.5 ? `Volume ${rv}x average — elevated activity.`
        : rv > 0.8 ? `Volume ${rv}x average — normal activity.`
        : `Volume ${rv}x average — subdued activity.`
        : 'Volume data unavailable.',
    };
  }

  private assessConfluence(
    trend: TrendAnalysis,
    momentum: MomentumAnalysis,
    volatility: VolatilityAnalysis,
    volume: VolumeAnalysis,
  ): ConfluenceAssessment {
    let positive = 0;
    let negative = 0;
    let total = 0;

    if (trend.trendStrength === 'strong') {
      if (trend.sma20 !== null && trend.sma50 !== null && trend.sma20 > trend.sma50) positive++;
      else negative++;
      total++;
    }

    if (momentum.momentumBias === 'positive') { positive++; total++; }
    else if (momentum.momentumBias === 'negative') { negative++; total++; }

    if (volume.relativeVolume !== null && volume.relativeVolume > 1.2) { total++; positive++; }

    const agreement = Math.max(positive, negative);
    const ratio = total > 0 ? agreement / total : 0;

    return {
      agreementCount: agreement,
      totalIndicators: total,
      agreementRatio: Math.round(ratio * 100) / 100,
      description: total > 0
        ? `${agreement}/${total} indicators in agreement.`
        : 'Insufficient indicators for confluence assessment.',
    };
  }

  private classifyRegime(
    trend: TrendAnalysis,
    momentum: MomentumAnalysis,
    volatility: VolatilityAnalysis,
    volume: VolumeAnalysis,
    confluence: ConfluenceAssessment,
  ): { regime: TechnicalRegime; confidence: number } {
    if (trend.sma20 === null && momentum.rsi === null) {
      return { regime: 'insufficient_data', confidence: 0 };
    }

    const trendUp = trend.sma20 !== null && trend.sma50 !== null && trend.sma20 > trend.sma50;
    const trendDown = trend.sma20 !== null && trend.sma50 !== null && trend.sma20 < trend.sma50;
    const rsiOverextended = momentum.rsi !== null && momentum.rsi > 70;
    const rsiOversold = momentum.rsi !== null && momentum.rsi < 30;
    const highVol = volatility.volatilityLevel === 'high';
    const highVolume = volume.relativeVolume !== null && volume.relativeVolume > 2;

    if (trendUp && rsiOverextended) return { regime: 'overextended_up', confidence: 0.65 };
    if (trendDown && rsiOversold) return { regime: 'overextended_down', confidence: 0.65 };
    if (highVol) return { regime: 'volatile', confidence: 0.55 };
    if (trendUp && confluence.agreementRatio >= 0.66) return { regime: 'strong_uptrend', confidence: 0.7 };
    if (trendDown && confluence.agreementRatio >= 0.66) return { regime: 'strong_downtrend', confidence: 0.7 };
    if (trendUp) return { regime: 'uptrend', confidence: 0.5 };
    if (trendDown) return { regime: 'downtrend', confidence: 0.5 };
    if (highVolume && momentum.momentumBias === 'positive') return { regime: 'accumulation', confidence: 0.35 };
    if (highVolume && momentum.momentumBias === 'negative') return { regime: 'distribution', confidence: 0.35 };

    return { regime: 'rangebound', confidence: 0.4 };
  }

  private describeRegime(regime: TechnicalRegime): string {
    const descriptions: Record<TechnicalRegime, string> = {
      strong_uptrend: 'Price in a strong upward trend with multiple confirming indicators.',
      uptrend: 'Price in a moderate upward trend.',
      rangebound: 'Price is rangebound — no clear directional trend.',
      downtrend: 'Price in a moderate downward trend.',
      strong_downtrend: 'Price in a strong downward trend with multiple confirming indicators.',
      overextended_up: 'Price has moved significantly above trend — extended territory.',
      overextended_down: 'Price has moved significantly below trend — extended territory.',
      volatile: 'Price exhibiting above-normal volatility.',
      accumulation: 'Potential accumulation — elevated volume with positive momentum.',
      distribution: 'Potential distribution — elevated volume with negative momentum.',
      insufficient_data: 'Insufficient technical data for regime classification.',
    };
    return descriptions[regime];
  }

  private buildSummary(regime: TechnicalRegime, confluence: ConfluenceAssessment): string {
    return `${this.describeRegime(regime)} ${confluence.description}`.trim();
  }
}

export const technicalRegimeEngine = new TechnicalRegimeEngine();
