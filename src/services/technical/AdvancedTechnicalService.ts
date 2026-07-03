export interface TechnicalIndicators {
  rsi: number;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
  bollingerUpper: number;
  bollingerMiddle: number;
  bollingerLower: number;
  bollingerWidth: number;
  sma20: number;
  sma50: number;
  sma200: number;
  ema12: number;
  ema26: number;
  atr: number;
  adx: number;
  obv: number;
  williamsR: number;
  cci: number;
  stochK: number;
  stochD: number;
  moneyFlowIndex: number;
  volumeRatio: number;
  avgVolume20: number;
  support: number;
  resistance: number;
}

export class AdvancedTechnicalService {
  computeAll(prices: number[], volumes: number[], highs: number[], lows: number[]): TechnicalIndicators {
    const closes = prices.filter(p => p > 0);
    const vols = volumes.slice(0, closes.length);
    const hs = highs.slice(0, closes.length);
    const ls = lows.slice(0, closes.length);

    return {
      rsi: this.computeRSI(closes, 14),
      macd: this.computeMACD(closes).macd,
      macdSignal: this.computeMACD(closes).signal,
      macdHistogram: this.computeMACD(closes).histogram,
      bollingerUpper: this.computeBollinger(closes).upper,
      bollingerMiddle: this.computeBollinger(closes).middle,
      bollingerLower: this.computeBollinger(closes).lower,
      bollingerWidth: this.computeBollinger(closes).width,
      sma20: this.computeSMA(closes, 20),
      sma50: this.computeSMA(closes, 50),
      sma200: this.computeSMA(closes, 200),
      ema12: this.computeEMA(closes, 12),
      ema26: this.computeEMA(closes, 26),
      atr: this.computeATR(highs, lows, closes, 14),
      adx: this.computeADX(highs, lows, closes, 14),
      obv: this.computeOBV(closes, vols),
      williamsR: this.computeWilliamsR(highs, lows, closes, 14),
      cci: this.computeCCI(highs, lows, closes, 20),
      stochK: this.computeStochastic(highs, lows, closes, 14).k,
      stochD: this.computeStochastic(highs, lows, closes, 14).d,
      moneyFlowIndex: this.computeMFI(highs, lows, closes, vols, 14),
      volumeRatio: vols.length > 0 && vols.slice(-20).length > 0 ? (vols[vols.length - 1] || 0) / (vols.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, vols.slice(-20).length)) : 1,
      avgVolume20: vols.slice(-20).reduce((a, b) => a + b, 0) / Math.min(20, vols.slice(-20).length),
      support: Math.min(...closes.slice(-50)),
      resistance: Math.max(...closes.slice(-50)),
    };
  }

  private computeSMA(data: number[], period: number): number {
    if (data.length < period) return 0;
    return data.slice(-period).reduce((a, b) => a + b, 0) / period;
  }

  private computeEMA(data: number[], period: number): number {
    if (data.length < period) return this.computeSMA(data, period);
    const multiplier = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private computeRSI(data: number[], period: number): number {
    if (data.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = data.length - period; i < data.length; i++) {
      const delta = data[i] - data[i - 1];
      if (delta > 0) gains += delta;
      else losses -= delta;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 10) / 10;
  }

  private computeMACD(data: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.computeEMA(data, 12);
    const ema26 = this.computeEMA(data, 26);
    const macd = ema12 - ema26;
    const signal = this.computeEMA([macd], 9);
    return { macd, signal, histogram: macd - signal };
  }

  private computeBollinger(data: number[], period = 20): { upper: number; middle: number; lower: number; width: number } {
    const middle = this.computeSMA(data, period);
    const slice = data.slice(-period);
    const variance = slice.reduce((sum, val) => sum + (val - middle) ** 2, 0) / slice.length;
    const stdDev = Math.sqrt(variance);
    const upper = middle + 2 * stdDev;
    const lower = middle - 2 * stdDev;
    return { upper, middle, lower, width: middle > 0 ? (upper - lower) / middle : 0 };
  }

  private computeATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < 2) return 0;
    const trueRanges: number[] = [];
    for (let i = Math.max(1, closes.length - period); i < closes.length; i++) {
      const h = highs[i] || closes[i];
      const l = lows[i] || closes[i];
      const pc = closes[i - 1];
      const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
      trueRanges.push(tr);
    }
    if (trueRanges.length === 0) return 0;
    return trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
  }

  private computeADX(highs: number[], lows: number[], closes: number[], period: number): number {
    if (closes.length < period + 1) return 25;
    const plusDM: number[] = [];
    const minusDM: number[] = [];
    for (let i = closes.length - period; i < closes.length; i++) {
      const upMove = (highs[i] || 0) - (highs[i - 1] || 0);
      const downMove = (lows[i - 1] || 0) - (lows[i] || 0);
      plusDM.push(upMove > downMove && upMove > 0 ? upMove : 0);
      minusDM.push(downMove > upMove && downMove > 0 ? downMove : 0);
    }
    const avgPlus = plusDM.reduce((a, b) => a + b, 0) / plusDM.length;
    const avgMinus = minusDM.reduce((a, b) => a + b, 0) / minusDM.length;
    const atr = this.computeATR(highs, lows, closes, period);
    if (atr === 0) return 25;
    const diPlus = (avgPlus / atr) * 100;
    const diMinus = (avgMinus / atr) * 100;
    const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
    return Math.round(dx);
  }

  private computeOBV(closes: number[], volumes: number[]): number {
    if (closes.length < 2) return 0;
    let obv = 0;
    for (let i = 1; i < closes.length; i++) {
      if (closes[i] > closes[i - 1]) obv += (volumes[i] || 0);
      else if (closes[i] < closes[i - 1]) obv -= (volumes[i] || 0);
    }
    return obv;
  }

  private computeWilliamsR(highs: number[], lows: number[], closes: number[], period: number): number {
    const slice = closes.slice(-period);
    const high = Math.max(...slice);
    const low = Math.min(...slice);
    const close = slice[slice.length - 1];
    if (high === low) return -50;
    return -((high - close) / (high - low)) * 100;
  }

  private computeCCI(highs: number[], lows: number[], closes: number[], period: number): number {
    const tp: number[] = [];
    for (let i = Math.max(0, closes.length - period); i < closes.length; i++) {
      const h = highs[i] || closes[i];
      const l = lows[i] || closes[i];
      tp.push((h + l + closes[i]) / 3);
    }
    if (tp.length === 0) return 0;
    const sma = tp.reduce((a, b) => a + b, 0) / tp.length;
    const meanDev = tp.reduce((sum, val) => sum + Math.abs(val - sma), 0) / tp.length;
    if (meanDev === 0) return 0;
    return (tp[tp.length - 1] - sma) / (0.015 * meanDev);
  }

  private computeStochastic(highs: number[], lows: number[], closes: number[], period: number): { k: number; d: number } {
    const slice = closes.slice(-period);
    const high = Math.max(...slice.map((_, i) => highs[closes.length - period + i] || closes[closes.length - period + i]));
    const low = Math.min(...slice);
    const close = slice[slice.length - 1];
    if (high === low) return { k: 50, d: 50 };
    const k = ((close - low) / (high - low)) * 100;
    const d = k;
    return { k: Math.round(k), d: Math.round((k + k) / 2) };
  }

  private computeMFI(highs: number[], lows: number[], closes: number[], volumes: number[], period: number): number {
    if (closes.length < period + 1) return 50;
    const typicalPrices: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      typicalPrices.push(((highs[i] || closes[i]) + (lows[i] || closes[i]) + closes[i]) / 3);
    }
    let positiveFlow = 0, negativeFlow = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const moneyFlow = typicalPrices[i] * (volumes[i] || 0);
      if (typicalPrices[i] > typicalPrices[i - 1]) positiveFlow += moneyFlow;
      else negativeFlow += moneyFlow;
    }
    const ratio = negativeFlow > 0 ? positiveFlow / negativeFlow : 100;
    return Math.round(100 - 100 / (1 + ratio));
  }

  computeSignals(indicators: TechnicalIndicators): { signal: 'buy' | 'sell' | 'neutral'; strength: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    if (indicators.rsi < 30) { score += 20; reasons.push(`RSI oversold (${indicators.rsi})`); }
    else if (indicators.rsi > 70) { score -= 20; reasons.push(`RSI overbought (${indicators.rsi})`); }
    else reasons.push(`RSI neutral (${indicators.rsi})`);

    if (indicators.macd > indicators.macdSignal) { score += 15; reasons.push('MACD bullish crossover'); }
    else { score -= 15; reasons.push('MACD bearish'); }

    if (indicators.stochK < 20) { score += 10; reasons.push('Stochastic oversold'); }
    else if (indicators.stochK > 80) { score -= 10; reasons.push('Stochastic overbought'); }

    if (indicators.williamsR < -80) { score += 10; reasons.push('Williams %R oversold'); }
    else if (indicators.williamsR > -20) { score -= 10; reasons.push('Williams %R overbought'); }

    if (indicators.adx > 25) { score += 5; reasons.push(`Trending (ADX: ${indicators.adx})`); }
    else { score -= 5; reasons.push('Range-bound market'); }

    if (indicators.cci < -100) { score += 10; reasons.push('CCI oversold'); }
    else if (indicators.cci > 100) { score -= 10; reasons.push('CCI overbought'); }
    else reasons.push('CCI neutral');

    if (indicators.volumeRatio > 1.5) { score += 5; reasons.push('Above average volume'); }
    else if (indicators.volumeRatio < 0.5) { score -= 5; reasons.push('Below average volume'); }

    if (indicators.bollingerWidth > 0.05) score += 5;

    const signal = score >= 30 ? 'buy' : score <= -30 ? 'sell' : 'neutral';
    return { signal, strength: Math.min(100, Math.abs(score)), reasons };
  }
}

export const advancedTechnicalService = new AdvancedTechnicalService();
