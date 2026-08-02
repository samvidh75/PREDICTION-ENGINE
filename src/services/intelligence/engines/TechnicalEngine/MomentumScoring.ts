import logger from '../../../../config/logger';
import { TechnicalMetrics } from '../../types';

/**
 * Momentum Scoring Module
 * Max 20 points:
 *   - RSI (0-8 points): 50-65 sweet spot = 6-8, 30-50 = 4-6, <30 oversold=3-5, 65-75=2-4, >75 overbought=0-2
 *   - MACD (0-8 points): histogram >0 and positive divergence = 6-8, zero-line cross = 4-5, histogram >0 but narrowing = 2-3, negative = 0-1
 *   - RoC Price Change (0-4 points): Rate of change based on 1M, 3M, 6M, 1Y
 */

function scoreMACD(metrics: TechnicalMetrics): { score: number; note: string } {
  const { macd, macdSignal, macdHistogram } = metrics;
  if (macd === undefined || macdSignal === undefined) {
    return { score: 4, note: 'MACD data limited; using default mid-range score' };
  }

  const histogram = macdHistogram ?? (macd - macdSignal);

  if (histogram > 0 && macd > macdSignal) {
    return { score: 7, note: `Strong bullish MACD (histogram: ${histogram.toFixed(2)}, MACD above signal)` };
  } else if (histogram > 0) {
    return { score: 5, note: `MACD histogram positive (${histogram.toFixed(2)}) but signal mixed` };
  } else {
    return { score: 2, note: `Bearish MACD signal (histogram: ${histogram.toFixed(2)})` };
  }
}

function scoreRSI(metrics: TechnicalMetrics): { score: number; note: string } {
  const { rsi } = metrics;
  if (rsi === undefined) { return { score: 4, note: 'RSI not available' }; }
  if (rsi >= 40 && rsi <= 60) { return { score: 7, note: `RSI ${rsi} is in the healthy power zone (40-60)` }; }
  if (rsi >= 30 && rsi < 40) { return { score: 5, note: `RSI ${rsi} shows mild weakness, approaching oversold` }; }
  if (rsi > 60 && rsi <= 70) { return { score: 5, note: `RSI ${rsi} shows mild strength, approaching overbought` }; }
  if (rsi > 70) { return { score: 3, note: `RSI ${rsi} is overbought, high risk of pullback` }; }
  return { score: 3, note: `RSI ${rsi} is oversold, potential reversal opportunity` };
}

function scoreRoC(metrics: TechnicalMetrics): { score: number; note: string } {
  let rocScore = 0;
  const notes: string[] = [];

  if (metrics.priceChange1M !== undefined) {
    rocScore += metrics.priceChange1M > 0 ? 1 : 0;
    notes.push(`1M: ${metrics.priceChange1M > 0 ? '+' : ''}${metrics.priceChange1M}%`);
  }
  if (metrics.priceChange3M !== undefined) {
    rocScore += metrics.priceChange3M > 0 ? 1 : 0;
    notes.push(`3M: ${metrics.priceChange3M > 0 ? '+' : ''}${metrics.priceChange3M}%`);
  }
  if (metrics.priceChange6M !== undefined) {
    rocScore += metrics.priceChange6M > 0 ? 1 : 0;
    notes.push(`6M: ${metrics.priceChange6M > 0 ? '+' : ''}${metrics.priceChange6M}%`);
  }
  if (metrics.priceChange1Y !== undefined) {
    rocScore += metrics.priceChange1Y > 0 ? 1 : 0;
    notes.push(`1Y: ${metrics.priceChange1Y > 0 ? '+' : ''}${metrics.priceChange1Y}%`);
  }

  return { score: rocScore, note: notes.length > 0 ? `Rate of change: ${notes.join(', ')}` : 'No RoC data available' };
}

export function momentumScoring(metrics: TechnicalMetrics): {
  totalScore: number;
  rsiScore: number;
  macdScore: number;
  rocScore: number;
  details: string;
} {
  const rsi = scoreRSI(metrics);
  const macd = scoreMACD(metrics);
  const roc = scoreRoC(metrics);

  logger.info({ rsiScore: rsi.score, macdScore: macd.score, rocScore: roc.score }, 'Momentum scores computed');

  return {
    totalScore: rsi.score + macd.score + roc.score,
    rsiScore: rsi.score,
    macdScore: macd.score,
    rocScore: roc.score,
    details: `RSI: ${rsi.note} | MACD: ${macd.note} | RoC: ${roc.note}`,
  };
}
