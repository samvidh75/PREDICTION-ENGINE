import { PriceBar, FundamentalSnapshot, FeatureVector } from './types';

const TRADING_DAYS = 252;

/**
 * Builds a technical + fundamental feature vector from historical bars.
 * Every feature is computed strictly from bars[0..i] (no lookahead) so the
 * same function is safe to call inside a walk-forward loop.
 */
export class FeatureEngineer {
  /** Build features using the full bar history provided (caller controls the lookahead boundary). */
  buildFeatures(bars: PriceBar[], fundamentals?: FundamentalSnapshot): FeatureVector {
    if (bars.length < 2) {
      throw new Error('FeatureEngineer: need at least 2 bars');
    }
    for (const bar of bars) {
      if (!Number.isFinite(bar.close) || bar.close <= 0) {
        throw new Error(`FeatureEngineer: invalid close price on ${bar.date}`);
      }
    }

    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);
    const returns = this.pctReturns(closes);

    const features: FeatureVector = {
      // Momentum
      return_5d: this.periodReturn(closes, 5),
      return_20d: this.periodReturn(closes, 20),
      return_60d: this.periodReturn(closes, 60),
      // Trend
      sma_ratio_20: this.smaRatio(closes, 20),
      sma_ratio_50: this.smaRatio(closes, 50),
      ema_ratio_12_26: this.emaRatio(closes),
      // Oscillators
      rsi_14: this.rsi(closes, 14),
      macd_hist: this.macdHistogram(closes),
      // Volatility
      volatility_20d: this.annualizedVolatility(returns, 20),
      bollinger_pctb: this.bollingerPercentB(closes, 20),
      // Volume
      volume_ratio_20d: this.volumeRatio(volumes, 20),
      // Fundamentals (missing -> neutral 0, flagged via presence features)
      pe_ratio: fundamentals?.peRatio ?? 0,
      pb_ratio: fundamentals?.pbRatio ?? 0,
      roe: fundamentals?.roe ?? 0,
      debt_to_equity: fundamentals?.debtToEquity ?? 0,
      revenue_growth_yoy: fundamentals?.revenueGrowthYoy ?? 0,
      eps_growth_yoy: fundamentals?.epsGrowthYoy ?? 0,
      dividend_yield: fundamentals?.dividendYield ?? 0,
      has_fundamentals: fundamentals ? 1 : 0,
    };

    for (const [key, value] of Object.entries(features)) {
      if (!Number.isFinite(value)) {
        features[key] = 0; // fail safe rather than propagate NaN into downstream models
      }
    }
    return features;
  }

  // --- Individual indicators -------------------------------------------------

  private pctReturns(closes: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      returns.push(closes[i] / closes[i - 1] - 1);
    }
    return returns;
  }

  private periodReturn(closes: number[], period: number): number {
    if (closes.length <= period) return 0;
    const past = closes[closes.length - 1 - period];
    const current = closes[closes.length - 1];
    return past > 0 ? current / past - 1 : 0;
  }

  private sma(closes: number[], period: number): number {
    const window = closes.slice(-period);
    return window.reduce((s, c) => s + c, 0) / window.length;
  }

  private smaRatio(closes: number[], period: number): number {
    if (closes.length < period) return 0;
    const smaVal = this.sma(closes, period);
    return smaVal > 0 ? closes[closes.length - 1] / smaVal - 1 : 0;
  }

  private ema(closes: number[], period: number): number[] {
    const k = 2 / (period + 1);
    const emaSeries: number[] = [closes[0]];
    for (let i = 1; i < closes.length; i++) {
      emaSeries.push(closes[i] * k + emaSeries[i - 1] * (1 - k));
    }
    return emaSeries;
  }

  private emaRatio(closes: number[]): number {
    if (closes.length < 26) return 0;
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    const last12 = ema12[ema12.length - 1];
    const last26 = ema26[ema26.length - 1];
    return last26 > 0 ? last12 / last26 - 1 : 0;
  }

  private macdHistogram(closes: number[]): number {
    if (closes.length < 35) return 0;
    const ema12 = this.ema(closes, 12);
    const ema26 = this.ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = this.ema(macdLine, 9);
    const hist = macdLine[macdLine.length - 1] - signalLine[signalLine.length - 1];
    const price = closes[closes.length - 1];
    return price > 0 ? hist / price : 0; // normalize by price so scale is comparable across stocks
  }

  /**
   * Wilder's smoothed RSI: seeds from the first `period` changes, then
   * exponentially decays over the rest of the series (weight 1/period per
   * step). This is the standard formulation — unlike a plain trailing
   * average, it incorporates the whole history so it doesn't saturate to
   * 0/1 as readily during a long uninterrupted run.
   */
  private rsi(closes: number[], period: number): number {
    if (closes.length <= period) return 0.5;
    const changes: number[] = [];
    for (let i = 1; i < closes.length; i++) changes.push(closes[i] - closes[i - 1]);

    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
      if (changes[i] > 0) avgGain += changes[i];
      else avgLoss -= changes[i];
    }
    avgGain /= period;
    avgLoss /= period;

    for (let i = period; i < changes.length; i++) {
      const gain = changes[i] > 0 ? changes[i] : 0;
      const loss = changes[i] < 0 ? -changes[i] : 0;
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgGain === 0 && avgLoss === 0) return 0.5; // no movement at all -> neutral
    if (avgLoss === 0) return 1; // real gains, zero losses -> fully overbought
    const rs = avgGain / avgLoss;
    return 1 - 1 / (1 + rs); // normalized to [0,1] instead of the traditional [0,100]
  }

  private annualizedVolatility(returns: number[], period: number): number {
    if (returns.length < 2) return 0;
    const window = returns.slice(-period);
    const mean = window.reduce((s, r) => s + r, 0) / window.length;
    const variance =
      window.length > 1
        ? window.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (window.length - 1)
        : 0;
    return Math.sqrt(Math.max(0, variance) * TRADING_DAYS);
  }

  private bollingerPercentB(closes: number[], period: number): number {
    if (closes.length < period) return 0.5;
    const window = closes.slice(-period);
    const mean = window.reduce((s, c) => s + c, 0) / period;
    const variance = window.reduce((s, c) => s + (c - mean) * (c - mean), 0) / period;
    const std = Math.sqrt(variance);
    if (std === 0) return 0.5;
    const upper = mean + 2 * std;
    const lower = mean - 2 * std;
    const price = closes[closes.length - 1];
    return (price - lower) / (upper - lower);
  }

  private volumeRatio(volumes: number[], period: number): number {
    if (volumes.length < period + 1) return 1;
    const priorWindow = volumes.slice(-(period + 1), -1);
    const avg = priorWindow.reduce((s, v) => s + v, 0) / priorWindow.length;
    return avg > 0 ? volumes[volumes.length - 1] / avg : 1;
  }
}
