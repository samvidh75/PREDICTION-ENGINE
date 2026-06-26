import type { EngineInput, EngineResult } from './types';
import { MOMENTUM_THRESHOLDS as M } from './calibration';
import { weightedAverage } from '@/types';

export class MomentumEngine {
  static evaluate(input: EngineInput): EngineResult {
    const rsi = input.technicals?.rsi ?? null;
    const macd = input.technicals?.macd ?? null;
    const macdSignal = input.technicals?.macdSignal ?? null;
    const adx = input.technicals?.adx ?? null;
    const trendStrength = input.technicals?.trendStrength ?? null;

    let rsiScore = 50;
    if (rsi !== null) {
      if (rsi >= M.RSI_BULLISH_LOW && rsi <= M.RSI_BULLISH_HIGH) rsiScore = 90;
      else if (rsi >= 50 && rsi < M.RSI_BULLISH_LOW) rsiScore = 75;
      else if (rsi > M.RSI_BULLISH_HIGH && rsi <= M.RSI_OVERBOUGHT) rsiScore = 65;
      else if (rsi > M.RSI_OVERBOUGHT && rsi <= M.RSI_EXTREME_OVERBOUGHT) rsiScore = 40;
      else if (rsi > M.RSI_EXTREME_OVERBOUGHT) rsiScore = 20;
      else if (rsi >= M.RSI_NEUTRAL_LOW && rsi < 50) rsiScore = 50;
      else if (rsi >= M.RSI_OVERSOLD && rsi < M.RSI_NEUTRAL_LOW) rsiScore = 35;
      else rsiScore = 25;
    }

    let macdScore = 50;
    if (macd !== null && macdSignal !== null) {
      const diff = macd - macdSignal;
      if (diff > 0) macdScore = 75;
      else macdScore = 25;
    }

    let adxScore = 50;
    if (adx !== null) {
      if (adx >= M.ADX_STRONG) adxScore = 80;
      else if (adx >= M.ADX_TRENDING) adxScore = 70;
      else if (adx >= M.ADX_MODERATE) adxScore = 60;
      else if (adx >= M.ADX_WEAK) adxScore = 45;
      else adxScore = 30;
    }

    let trendScore = 50;
    if (trendStrength !== null) {
      if (trendStrength >= M.TREND_STRONG) trendScore = 90;
      else if (trendStrength >= M.TREND_MODERATE) trendScore = 75;
      else if (trendStrength >= 0) trendScore = 55;
      else if (trendStrength >= M.TREND_WEAK) trendScore = 35;
      else if (trendStrength >= -0.05) trendScore = 20;
      else trendScore = 10;
    }

    const score = weightedAverage([
      { score: rsiScore, weight: 5 },
      { score: macdScore, weight: 5 },
      { score: adxScore, weight: 4 },
      { score: trendScore, weight: 6 },
    ]);

    const hasData = rsi !== null || macd !== null || adx !== null;
    const confidence: 'high' | 'medium' | 'low' = !hasData ? 'low' : 'medium';

    return { score, confidence };
  }
}
