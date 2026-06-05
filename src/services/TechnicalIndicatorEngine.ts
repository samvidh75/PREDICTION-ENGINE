import type { HistoricalPoint } from './data/types';
import type { StockFeatureSnapshot } from './FeatureEngine';

export class TechnicalIndicatorEngine {
  static calculate(symbol: string, history: HistoricalPoint[]): StockFeatureSnapshot[] {
    const rows = history
      .filter((p) => Number.isFinite(p.open) && Number.isFinite(p.high) && Number.isFinite(p.low) && Number.isFinite(p.close) && p.close > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const n = rows.length;
    if (n < 2) return [];

    const dates = rows.map((r) => r.date);
    const opens = rows.map((r) => Number(r.open));
    const highs = rows.map((r) => Number(r.high));
    const lows = rows.map((r) => Number(r.low));
    const closes = rows.map((r) => Number(r.close));

    const rsiArr = new Array<number | null>(n).fill(null);
    const macdArr = new Array<number | null>(n).fill(null);
    const macdSigArr = new Array<number | null>(n).fill(null);
    const macdHistArr = new Array<number | null>(n).fill(null);
    const adxArr = new Array<number | null>(n).fill(null);
    const atrArr = new Array<number | null>(n).fill(null);
    const bbWidthArr = new Array<number | null>(n).fill(null);
    const momArr = new Array<number | null>(n).fill(null);
    const volArr = new Array<number | null>(n).fill(null);
    const relStrArr = new Array<number | null>(n).fill(null);
    const maDistArr = new Array<number | null>(n).fill(null);
    const trendStrArr = new Array<number | null>(n).fill(null);

    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i < n; i++) {
      const change = closes[i] - closes[i - 1];
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;
      if (i < 15) {
        avgGain += gain;
        avgLoss += loss;
        if (i === 14) {
          avgGain /= 14;
          avgLoss /= 14;
          rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
        }
      } else {
        avgGain = (avgGain * 13 + gain) / 14;
        avgLoss = (avgLoss * 13 + loss) / 14;
        rsiArr[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
      }
    }

    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    const macdLine = new Array<number | null>(n).fill(null);
    for (let i = 0; i < n; i++) {
      if (ema12[i] !== null && ema26[i] !== null) macdLine[i] = ema12[i]! - ema26[i]!;
    }
    const macdSignal = this.ema(macdLine.map((v) => v ?? 0), 9);
    for (let i = 0; i < n; i++) {
      if (macdLine[i] !== null && macdSignal[i] !== null) {
        macdArr[i] = macdLine[i];
        macdSigArr[i] = macdSignal[i];
        macdHistArr[i] = macdLine[i]! - macdSignal[i]!;
      }
    }

    const tr = new Array<number>(n).fill(0);
    tr[0] = highs[0] - lows[0];
    for (let i = 1; i < n; i++) {
      tr[i] = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
    }
    let sumTR = 0;
    for (let i = 0; i < n; i++) {
      if (i < 14) {
        sumTR += tr[i];
        if (i === 13) atrArr[i] = sumTR / 14;
      } else {
        atrArr[i] = (atrArr[i - 1]! * 13 + tr[i]) / 14;
      }
    }

    const plusDM = new Array<number>(n).fill(0);
    const minusDM = new Array<number>(n).fill(0);
    for (let i = 1; i < n; i++) {
      const upMove = highs[i] - highs[i - 1];
      const downMove = lows[i - 1] - lows[i];
      if (upMove > downMove && upMove > 0) plusDM[i] = upMove;
      else if (downMove > upMove && downMove > 0) minusDM[i] = downMove;
    }
    let smoothedTR = 0;
    let smoothedPlusDM = 0;
    let smoothedMinusDM = 0;
    const dxArr = new Array<number | null>(n).fill(null);
    for (let i = 0; i < n; i++) {
      if (i < 14) {
        smoothedTR += tr[i];
        smoothedPlusDM += plusDM[i];
        smoothedMinusDM += minusDM[i];
        if (i === 13) {
          smoothedTR /= 14;
          smoothedPlusDM /= 14;
          smoothedMinusDM /= 14;
        } else {
          continue;
        }
      } else {
        smoothedTR = (smoothedTR * 13 + tr[i]) / 14;
        smoothedPlusDM = (smoothedPlusDM * 13 + plusDM[i]) / 14;
        smoothedMinusDM = (smoothedMinusDM * 13 + minusDM[i]) / 14;
      }
      const plusDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
      const minusDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;
      dxArr[i] = Math.abs(plusDI - minusDI) / Math.max(1, plusDI + minusDI) * 100;
    }
    const dxValues: number[] = [];
    for (let i = 0; i < n; i++) {
      if (dxArr[i] === null) continue;
      dxValues.push(dxArr[i]!);
      if (dxValues.length === 14) adxArr[i] = dxValues.reduce((s, v) => s + v, 0) / 14;
      else if (dxValues.length > 14) adxArr[i] = (adxArr[i - 1]! * 13 + dxArr[i]!) / 14;
    }

    for (let i = 19; i < n; i++) {
      const window = closes.slice(i - 19, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / 20;
      const stdDev = Math.sqrt(window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20);
      bbWidthArr[i] = mean === 0 ? 0 : (stdDev * 4) / mean;
    }
    for (let i = 10; i < n; i++) momArr[i] = (closes[i] - closes[i - 10]) / closes[i - 10];

    const dailyReturns = new Array<number>(n).fill(0);
    for (let i = 1; i < n; i++) dailyReturns[i] = (closes[i] - closes[i - 1]) / closes[i - 1];
    for (let i = 20; i < n; i++) {
      const window = dailyReturns.slice(i - 19, i + 1);
      const mean = window.reduce((a, b) => a + b, 0) / 20;
      const variance = window.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
      volArr[i] = Math.sqrt(variance) * Math.sqrt(252);
    }
    for (let i = 0; i < n; i++) relStrArr[i] = opens[i] === 0 ? 0 : (closes[i] - opens[i]) / opens[i];
    for (let i = 49; i < n; i++) {
      const window = closes.slice(i - 49, i + 1);
      const sma50 = window.reduce((a, b) => a + b, 0) / 50;
      maDistArr[i] = sma50 === 0 ? 0 : (closes[i] - sma50) / sma50;
    }
    const ema20 = this.ema(closes, 20);
    const ema50 = this.ema(closes, 50);
    for (let i = 0; i < n; i++) {
      if (ema20[i] !== null && ema50[i] !== null && closes[i] !== 0) {
        trendStrArr[i] = ((ema20[i]! - ema50[i]!) / closes[i]) * (1 + (adxArr[i] ?? 25) / 100);
      }
    }

    return rows.map((_, i) => ({
      symbol,
      tradeDate: dates[i],
      rsi: rsiArr[i],
      macd: macdArr[i],
      macdSignal: macdSigArr[i],
      macdHistogram: macdHistArr[i],
      adx: adxArr[i],
      atr: atrArr[i],
      bollingerWidth: bbWidthArr[i],
      momentum: momArr[i],
      volatility: volArr[i],
      relativeStrength: relStrArr[i],
      movingAverageDistance: maDistArr[i],
      trendStrength: trendStrArr[i],
    }));
  }

  static latestComplete(symbol: string, history: HistoricalPoint[]): StockFeatureSnapshot | null {
    const snapshots = this.calculate(symbol, history);
    for (let i = snapshots.length - 1; i >= 0; i--) {
      const s = snapshots[i];
      if (s.rsi !== null && s.macd !== null && s.atr !== null && s.momentum !== null && s.volatility !== null) return s;
    }
    return snapshots.at(-1) ?? null;
  }

  private static ema(values: number[], period: number): (number | null)[] {
    const ema = new Array<number | null>(values.length).fill(null);
    if (values.length < period) return ema;
    const k = 2 / (period + 1);
    let sum = 0;
    for (let i = 0; i < period; i++) sum += values[i];
    ema[period - 1] = sum / period;
    for (let i = period; i < values.length; i++) ema[i] = values[i] * k + ema[i - 1]! * (1 - k);
    return ema;
  }
}
