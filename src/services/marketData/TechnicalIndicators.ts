// Pure TypeScript technical indicator library — no external dependencies.
// All indicators use standard Wilder smoothing or SMA formulas.

export interface TechnicalSnapshot {
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  adx14: number | null;
  atr14: number | null;
  bollingerWidth: number | null;
  movingAverageDistance50: number | null;
  closePrices: number[];  // last 60 closes, most recent last
  computedAt: string;
}

// ── EMA ──────────────────────────────────────────────────────────────────────

export function calcEMA(values: number[], period: number): number[] {
  if (values.length === 0 || period <= 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = values[0];
  result.push(ema);
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

// ── RSI (Wilder smoothing) ────────────────────────────────────────────────────

export function calcRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] > 0) avgGain += changes[i];
    else avgLoss += Math.abs(changes[i]);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder smooth over remaining
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// ── MACD ──────────────────────────────────────────────────────────────────────

export function calcMACD(closes: number[]): {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
} {
  const nullResult = { macd: null, signal: null, histogram: null };
  if (closes.length < 35) return nullResult;

  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);

  // MACD line = EMA12 - EMA26, aligned to same length
  const offset = ema26.length - ema12.length; // 0 here since both start from index 0
  const macdLine: number[] = [];
  for (let i = 0; i < ema26.length; i++) {
    macdLine.push(ema12[i + offset] - ema26[i]);
  }

  const signalLine = calcEMA(macdLine, 9);
  if (signalLine.length === 0) return nullResult;

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const lastHistogram = lastMacd - lastSignal;

  return { macd: lastMacd, signal: lastSignal, histogram: lastHistogram };
}

// ── ATR (Wilder smoothing) ────────────────────────────────────────────────────

export function calcATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period + 1) return null;

  const trValues: number[] = [];
  for (let i = 1; i < len; i++) {
    const hl = highs[i] - lows[i];
    const hpc = Math.abs(highs[i] - closes[i - 1]);
    const lpc = Math.abs(lows[i] - closes[i - 1]);
    trValues.push(Math.max(hl, hpc, lpc));
  }

  if (trValues.length < period) return null;

  // Seed ATR with simple average of first period
  let atr = trValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
  }
  return atr;
}

// ── ADX (Wilder smoothing) ────────────────────────────────────────────────────

export function calcADX(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14,
): number | null {
  const len = Math.min(highs.length, lows.length, closes.length);
  if (len < period * 2) return null;

  const plusDM: number[] = [];
  const minusDM: number[] = [];
  const trValues: number[] = [];

  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);

    const hl = highs[i] - lows[i];
    const hpc = Math.abs(highs[i] - closes[i - 1]);
    const lpc = Math.abs(lows[i] - closes[i - 1]);
    trValues.push(Math.max(hl, hpc, lpc));
  }

  if (trValues.length < period) return null;

  // First smoothed value = sum of first period
  let smoothedTR = trValues.slice(0, period).reduce((s, v) => s + v, 0);
  let smoothedPlusDM = plusDM.slice(0, period).reduce((s, v) => s + v, 0);
  let smoothedMinusDM = minusDM.slice(0, period).reduce((s, v) => s + v, 0);

  const dxValues: number[] = [];
  for (let i = period; i < trValues.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + trValues[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];

    const plusDI = smoothedTR !== 0 ? (smoothedPlusDM / smoothedTR) * 100 : 0;
    const minusDI = smoothedTR !== 0 ? (smoothedMinusDM / smoothedTR) * 100 : 0;
    const diSum = plusDI + minusDI;
    const dx = diSum !== 0 ? Math.abs(plusDI - minusDI) / diSum * 100 : 0;
    dxValues.push(dx);
  }

  if (dxValues.length < period) return null;

  // ADX = smoothed DX
  let adx = dxValues.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }
  return adx;
}

// ── Bollinger Width ───────────────────────────────────────────────────────────

export function calcBollingerWidth(closes: number[], period = 20): number | null {
  if (closes.length < period) return null;

  const slice = closes.slice(closes.length - period);
  const sma = slice.reduce((s, v) => s + v, 0) / period;
  const variance = slice.reduce((s, v) => s + (v - sma) ** 2, 0) / period;
  const stdDev = Math.sqrt(variance);

  if (sma === 0) return null;
  const upper = sma + 2 * stdDev;
  const lower = sma - 2 * stdDev;
  return (upper - lower) / sma;
}

// ── MA Distance ───────────────────────────────────────────────────────────────

export function calcMADistance(closes: number[], period = 50): number | null {
  if (closes.length < period) return null;

  const slice = closes.slice(closes.length - period);
  const sma = slice.reduce((s, v) => s + v, 0) / period;
  if (sma === 0) return null;

  const current = closes[closes.length - 1];
  return (current - sma) / sma;
}

// ── Main Computation ──────────────────────────────────────────────────────────

export function computeTechnicals(closes: number[]): TechnicalSnapshot {
  // Keep last 60 for snapshot
  const last60 = closes.slice(-60);

  // For ADX/ATR we only have close prices here — use close as proxy for high/low
  // when no OHLCV data is available (chart data with close-only source)
  const highs = last60;
  const lows = last60;

  return {
    rsi14: closes.length >= 15 ? calcRSI(closes, 14) : null,
    ...(() => {
      if (closes.length < 35) return { macd: null, macdSignal: null, macdHistogram: null };
      const r = calcMACD(closes);
      return { macd: r.macd, macdSignal: r.signal, macdHistogram: r.histogram };
    })(),
    adx14: closes.length >= 28 ? calcADX(highs, lows, closes, 14) : null,
    atr14: closes.length >= 15 ? calcATR(highs, lows, closes, 14) : null,
    bollingerWidth: closes.length >= 20 ? calcBollingerWidth(closes, 20) : null,
    movingAverageDistance50: closes.length >= 50 ? calcMADistance(closes, 50) : null,
    closePrices: last60,
    computedAt: new Date().toISOString(),
  };
}
