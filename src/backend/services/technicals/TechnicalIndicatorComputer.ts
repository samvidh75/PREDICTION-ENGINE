import type { OhlcvPoint, TechnicalIndicatorKey, TechnicalIndicatorSnapshot } from "../../../shared/technicals/TechnicalIndicatorTypes";

function sma(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result.push(sum / period);
  }
  return result;
}

function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prevEma === null) {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += values[j];
      prevEma = sum / period;
    } else {
      prevEma = (values[i] - prevEma) * multiplier + prevEma;
    }
    result.push(prevEma);
  }
  return result;
}

function rsi(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [null];
  if (values.length < 2) return result;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period && i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = 1; i < values.length; i++) {
    if (i < period) { result.push(null); continue; }
    if (i > period) {
      const diff = values[i] - values[i - 1];
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    }
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(Math.round((100 - 100 / (1 + rs)) * 100) / 100);
    }
  }
  return result;
}

function macd(values: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEma = ema(values, fastPeriod);
  const slowEma = ema(values, slowPeriod);
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (fastEma[i] === null || slowEma[i] === null) { macdLine.push(null); continue; }
    macdLine.push(fastEma[i]! - slowEma[i]!);
  }
  const signal = ema(macdLine.filter((v): v is number => v !== null), signalPeriod);
  const paddedSignal: (number | null)[] = [];
  let sigIdx = 0;
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] === null) { paddedSignal.push(null); continue; }
    paddedSignal.push(sigIdx < signal.length ? signal[sigIdx] : null);
    sigIdx++;
  }
  const histogram: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] === null || paddedSignal[i] === null) { histogram.push(null); continue; }
    histogram.push(Math.round((macdLine[i]! - paddedSignal[i]!) * 10000) / 10000);
  }
  return { macd: macdLine, signal: paddedSignal, histogram };
}

function bollinger(values: number[], period = 20, multiplier = 2): { upper: (number | null)[]; middle: (number | null)[]; lower: (number | null)[] } {
  const middle = sma(values, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (middle[i] === null) { upper.push(null); lower.push(null); continue; }
    const slice = values.slice(Math.max(0, i - period + 1), i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
    const std = Math.sqrt(variance);
    upper.push(Math.round((middle[i]! + multiplier * std) * 100) / 100);
    lower.push(Math.round((middle[i]! - multiplier * std) * 100) / 100);
  }
  return { upper, middle, lower };
}

function atr(candles: OhlcvPoint[], period = 14): (number | null)[] {
  const result: (number | null)[] = [null];
  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    const tr = Math.max(hl, hc, lc);
    if (i < period) { result.push(null); continue; }
    if (i === period) {
      let sum = 0;
      for (let j = 1; j <= period; j++) {
        const p = candles[j]; const pp = candles[j - 1];
        sum += Math.max(p.high - p.low, Math.abs(p.high - pp.close), Math.abs(p.low - pp.close));
      }
      result.push(Math.round((sum / period) * 100) / 100);
    } else {
      result.push(Math.round(((result[i - 1]! * (period - 1) + tr) / period) * 100) / 100);
    }
  }
  return result;
}

function adx(candles: OhlcvPoint[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < period + 2) return candles.map(() => null);

  const tr: number[] = [0];
  const plusDM: number[] = [0];
  const minusDM: number[] = [0];

  for (let i = 1; i < candles.length; i++) {
    const hl = candles[i].high - candles[i].low;
    const hc = Math.abs(candles[i].high - candles[i - 1].close);
    const lc = Math.abs(candles[i].low - candles[i - 1].close);
    tr.push(Math.max(hl, hc, lc));
    const upMove = candles[i].high - candles[i - 1].high;
    const downMove = candles[i - 1].low - candles[i].low;
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
  }

  const atrVals = atr(candles, period);

  const smoothTR: number[] = [];
  const smoothPDM: number[] = [];
  const smoothNDM: number[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < period) { result.push(null); smoothTR.push(0); smoothPDM.push(0); smoothNDM.push(0); continue; }
    if (i === period) {
      let sumTR = 0, sumPDM = 0, sumNDM = 0;
      for (let j = 1; j <= period; j++) { sumTR += tr[j]; sumPDM += plusDM[j]; sumNDM += minusDM[j]; }
      smoothTR.push(sumTR);
      smoothPDM.push(sumPDM);
      smoothNDM.push(sumNDM);
    } else {
      smoothTR.push(smoothTR[i - 1] - smoothTR[i - 1] / period + tr[i]);
      smoothPDM.push(smoothPDM[i - 1] - smoothPDM[i - 1] / period + plusDM[i]);
      smoothNDM.push(smoothNDM[i - 1] - smoothNDM[i - 1] / period + minusDM[i]);
    }
  }

  const dxValues: (number | null)[] = [];
  const firstAdxIdx = period * 2 - 1;

  for (let i = 0; i < candles.length; i++) {
    if (i < period) { dxValues.push(null); continue; }
    const pdi = smoothTR[i] > 0 ? (smoothPDM[i] / smoothTR[i]) * 100 : 0;
    const ndi = smoothTR[i] > 0 ? (smoothNDM[i] / smoothTR[i]) * 100 : 0;
    const sum = pdi + ndi;
    dxValues.push(sum > 0 ? Math.abs(pdi - ndi) / sum * 100 : 0);
  }

  for (let i = 0; i < candles.length; i++) {
    if (i < firstAdxIdx) { result.push(null); continue; }
    if (i === firstAdxIdx) {
      let sum = 0;
      for (let j = firstAdxIdx - period + 1; j <= firstAdxIdx; j++) sum += dxValues[j] ?? 0;
      result.push(Math.round((sum / period) * 100) / 100);
    } else {
      result.push(Math.round(((result[i - 1]! * (period - 1) + (dxValues[i] ?? 0)) / period) * 100) / 100);
    }
  }
  return result;
}

function stochastic(candles: OhlcvPoint[], kPeriod = 14, dPeriod = 3): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) { k.push(null); continue; }
    const high = Math.max(...candles.slice(i - kPeriod + 1, i + 1).map((c) => c.high));
    const low = Math.min(...candles.slice(i - kPeriod + 1, i + 1).map((c) => c.low));
    if (high === low) { k.push(50); continue; }
    k.push(Math.round(((candles[i].close - low) / (high - low)) * 10000) / 100);
  }
  const d: (number | null)[] = [];
  const validK = k.filter((v): v is number => v !== null);
  const kSma = sma(validK, dPeriod);
  let kIdx = 0;
  for (let i = 0; i < candles.length; i++) {
    if (k[i] === null) { d.push(null); continue; }
    d.push(kIdx < kSma.length ? kSma[kIdx] : null);
    kIdx++;
  }
  return { k, d };
}

function obv(candles: OhlcvPoint[]): (number | null)[] {
  const result: (number | null)[] = [candles.length > 0 ? 0 : null];
  for (let i = 1; i < candles.length; i++) {
    if (result[i - 1] === null) { result.push(null); continue; }
    if (candles[i].close > candles[i - 1].close) {
      result.push(result[i - 1]! + candles[i].volume);
    } else if (candles[i].close < candles[i - 1].close) {
      result.push(result[i - 1]! - candles[i].volume);
    } else {
      result.push(result[i - 1]!);
    }
  }
  return result;
}

function roc(values: number[], period = 12): (number | null)[] {
  return values.map((v, i) => i < period ? null : values[i - period] !== 0 ? Math.round(((v - values[i - period]) / values[i - period]) * 10000) / 100 : null);
}

function rollingVolatility(values: number[], period = 20): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period) { result.push(null); continue; }
    const slice = values.slice(i - period + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / period;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
    result.push(Math.round(Math.sqrt(variance) * 100) / 100);
  }
  return result;
}

const MIN_CANDLES = 250;

export function computeTechnicalIndicators(symbol: string, candles: OhlcvPoint[]): { snapshot: TechnicalIndicatorSnapshot; insufficientHistory: boolean } {
  if (candles.length < 2) {
    return { snapshot: { symbol, asOf: candles[0]?.date ?? "", indicators: {}, states: {}, computedAt: new Date().toISOString() }, insufficientHistory: true };
  }

  const sorted = [...candles].sort((a, b) => a.date.localeCompare(b.date));
  const closes = sorted.map((c) => c.close);
  const volumes = sorted.map((c) => c.volume);
  const last = sorted[sorted.length - 1];
  const insufficientHistory = sorted.length < MIN_CANDLES;

  function lastValue(arr: (number | null)[]): number | null {
    for (let i = arr.length - 1; i >= 0; i--) if (arr[i] !== null) return arr[i];
    return null;
  }

  function stateFor(arr: (number | null)[]): "available" | "insufficient_history" {
    return lastValue(arr) !== null ? "available" : "insufficient_history";
  }

  const rsiArr = rsi(closes, 14);
  const macdResult = macd(closes);
  const adxArr = adx(sorted, 14);
  const atrArr = atr(sorted, 14);
  const sma20Arr = sma(closes, 20);
  const sma50Arr = sma(closes, 50);
  const sma200Arr = sma(closes, 200);
  const ema20Arr = ema(closes, 20);
  const ema50Arr = ema(closes, 50);
  const ema200Arr = ema(closes, 200);
  const bb = bollinger(closes);
  const stoch = stochastic(sorted);
  const obvArr = obv(sorted);
  const rocArr = roc(closes, 12);
  const volArr = rollingVolatility(closes);
  const volSmaArr = sma(volumes, 20);

  const indicators: Partial<Record<TechnicalIndicatorKey, number | null>> = {
    rsi14: lastValue(rsiArr),
    macd: lastValue(macdResult.macd),
    macdSignal: lastValue(macdResult.signal),
    macdHistogram: lastValue(macdResult.histogram),
    adx14: lastValue(adxArr),
    atr14: lastValue(atrArr),
    sma20: lastValue(sma20Arr),
    sma50: lastValue(sma50Arr),
    sma200: lastValue(sma200Arr),
    ema20: lastValue(ema20Arr),
    ema50: lastValue(ema50Arr),
    ema200: lastValue(ema200Arr),
    bollingerUpper20: lastValue(bb.upper),
    bollingerMiddle20: lastValue(bb.middle),
    bollingerLower20: lastValue(bb.lower),
    stochK: lastValue(stoch.k),
    stochD: lastValue(stoch.d),
    obv: lastValue(obvArr),
    roc12: lastValue(rocArr),
    volatility20: lastValue(volArr),
    volumeSma20: lastValue(volSmaArr),
  };

  const indicatorKeys: TechnicalIndicatorKey[] = [
    "rsi14", "macd", "macdSignal", "macdHistogram", "adx14", "atr14",
    "sma20", "sma50", "sma200", "ema20", "ema50", "ema200",
    "bollingerUpper20", "bollingerMiddle20", "bollingerLower20",
    "stochK", "stochD", "obv", "roc12", "volatility20", "volumeSma20",
  ];

  const states: Partial<Record<TechnicalIndicatorKey, "available" | "missing" | "insufficient_history">> = {};
  for (const key of indicatorKeys) {
    if (indicators[key] !== null && indicators[key] !== undefined) {
      states[key] = "available";
    } else {
      states[key] = insufficientHistory ? "insufficient_history" : "missing";
    }
  }

  return {
    snapshot: {
      symbol,
      asOf: last.date,
      indicators,
      states,
      computedAt: new Date().toISOString(),
    },
    insufficientHistory,
  };
}
