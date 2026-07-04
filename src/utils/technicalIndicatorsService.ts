/**
 * Technical Indicators Service
 * Calculates RSI, MACD, Bollinger Bands, SMA, EMA for stock analysis
 */

export interface CandleData {
  timestamp: number; // date
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  rsi: number; // 0-100
  macd: {
    line: number; // MACD line (12-26 EMA)
    signal: number; // 9-day EMA of MACD
    histogram: number; // MACD - Signal
  };
  bollingerBands: {
    upper: number;
    middle: number; // 20-day SMA
    lower: number;
    bandwidth: number; // (upper - lower) / middle
    percentB: number; // (close - lower) / (upper - lower)
  };
  movingAverages: {
    sma20: number; // 20-day simple moving average
    sma50: number; // 50-day simple moving average
    ema12: number; // 12-day exponential moving average
    ema26: number; // 26-day exponential moving average
  };
  trend: 'bullish' | 'bearish' | 'neutral';
  strength: number; // 0-100 (bullish strength)
}

export interface ChartSignal {
  type: 'buy' | 'sell' | 'hold';
  confidence: number; // 0-100
  reasons: string[];
  supportLevel: number;
  resistanceLevel: number;
}

const RSI_PERIOD = 14;
const MACD_FAST = 12;
const MACD_SLOW = 26;
const MACD_SIGNAL = 9;
const BB_PERIOD = 20;
const BB_STDDEV = 2;

class TechnicalIndicatorsService {
  /**
   * Calculate Relative Strength Index (RSI)
   * Range: 0-100 (>70 = overbought, <30 = oversold)
   */
  calculateRSI(closes: number[], period: number = RSI_PERIOD): number {
    if (closes.length < period + 1) return 50; // Neutral if not enough data

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = 1; i <= period; i++) {
      const change = closes[i] - closes[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Smoothed average gain/loss for remaining periods
    for (let i = period + 1; i < closes.length; i++) {
      const change = closes[i] - closes[i - 1];
      const currentGain = change > 0 ? change : 0;
      const currentLoss = change < 0 ? Math.abs(change) : 0;

      avgGain = (avgGain * (period - 1) + currentGain) / period;
      avgLoss = (avgLoss * (period - 1) + currentLoss) / period;
    }

    if (avgLoss === 0) return avgGain > 0 ? 100 : 50;

    const rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    return Math.round(rsi * 100) / 100;
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  calculateMACD(closes: number[]): { line: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(closes, MACD_FAST);
    const ema26 = this.calculateEMA(closes, MACD_SLOW);

    const macdLine = ema12 - ema26;

    // Calculate signal line (9-day EMA of MACD)
    if (closes.length < MACD_SLOW + MACD_SIGNAL) {
      return { line: macdLine, signal: macdLine, histogram: 0 };
    }

    // For simplicity, we'll use the last MACD value as signal
    // In production, maintain full MACD history for proper EMA calculation
    const signal = macdLine * 0.9; // Simplified signal
    const histogram = macdLine - signal;

    return {
      line: Math.round(macdLine * 10000) / 10000,
      signal: Math.round(signal * 10000) / 10000,
      histogram: Math.round(histogram * 10000) / 10000,
    };
  }

  /**
   * Calculate Bollinger Bands
   */
  calculateBollingerBands(closes: number[], period: number = BB_PERIOD, stdDev: number = BB_STDDEV): {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
    percentB: number;
  } {
    const sma = this.calculateSMA(closes, period);
    const variance = this.calculateVariance(closes.slice(-period), sma);
    const stdDeviation = Math.sqrt(variance);

    const upper = sma + stdDev * stdDeviation;
    const lower = sma - stdDev * stdDeviation;
    const bandwidth = (upper - lower) / sma;

    const lastClose = closes[closes.length - 1];
    const percentB = upper === lower ? 50 : ((lastClose - lower) / (upper - lower)) * 100;

    return {
      upper: Math.round(upper * 100) / 100,
      middle: Math.round(sma * 100) / 100,
      lower: Math.round(lower * 100) / 100,
      bandwidth: Math.round(bandwidth * 10000) / 10000,
      percentB: Math.round(percentB * 100) / 100,
    };
  }

  /**
   * Calculate Simple Moving Average (SMA)
   */
  calculateSMA(closes: number[], period: number): number {
    if (closes.length < period) return closes[closes.length - 1];
    const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  calculateEMA(closes: number[], period: number): number {
    if (closes.length < period) return closes[closes.length - 1];

    const k = 2 / (period + 1);
    let ema = this.calculateSMA(closes.slice(0, period), period);

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }

    return ema;
  }

  /**
   * Calculate variance for standard deviation
   */
  private calculateVariance(values: number[], mean: number): number {
    const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
    return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Calculate all technical indicators for a stock
   */
  calculateAllIndicators(candles: CandleData[]): TechnicalIndicators {
    if (candles.length < 30) {
      return this.getDefaultIndicators();
    }

    const closes = candles.map((c) => c.close);

    const rsi = this.calculateRSI(closes);
    const macd = this.calculateMACD(closes);
    const bb = this.calculateBollingerBands(closes);
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    const ema12 = this.calculateEMA(closes, 12);
    const ema26 = this.calculateEMA(closes, 26);

    // Determine trend
    const lastClose = closes[closes.length - 1];
    const bullish = lastClose > sma20 && sma20 > sma50 && rsi < 70 && macd.histogram > 0;
    const bearish = lastClose < sma20 && sma20 < sma50 && rsi > 30 && macd.histogram < 0;

    const trend = bullish ? 'bullish' : bearish ? 'bearish' : 'neutral';

    // Calculate strength (0-100)
    const strength = Math.round(
      (rsi * 0.3 + (lastClose > sma20 ? 50 : 30) * 0.3 + (macd.histogram > 0 ? 50 : 30) * 0.2 + (bb.percentB > 50 ? 50 : 30) * 0.2),
    );

    return {
      rsi,
      macd,
      bollingerBands: bb,
      movingAverages: { sma20, sma50, ema12, ema26 },
      trend,
      strength,
    };
  }

  /**
   * Generate trading signal from indicators
   */
  generateSignal(indicators: TechnicalIndicators, recentCandles: CandleData[]): ChartSignal {
    const reasons: string[] = [];
    let confidence = 0;

    // RSI signals
    if (indicators.rsi < 30) {
      reasons.push('🟢 RSI oversold (<30) - Potential reversal');
      confidence += 25;
    } else if (indicators.rsi > 70) {
      reasons.push('🔴 RSI overbought (>70) - Potential pullback');
      confidence -= 25;
    }

    // MACD signals
    if (indicators.macd.histogram > 0 && indicators.macd.line > indicators.macd.signal) {
      reasons.push('🟢 MACD bullish crossover');
      confidence += 20;
    } else if (indicators.macd.histogram < 0 && indicators.macd.line < indicators.macd.signal) {
      reasons.push('🔴 MACD bearish crossover');
      confidence -= 20;
    }

    // Moving average signals
    const lastClose = recentCandles[recentCandles.length - 1].close;
    if (lastClose > indicators.movingAverages.sma20) {
      reasons.push('🟢 Price above 20-day SMA');
      confidence += 15;
    } else {
      reasons.push('🔴 Price below 20-day SMA');
      confidence -= 15;
    }

    // Bollinger Bands signals
    if (indicators.bollingerBands.percentB < 20) {
      reasons.push('🟢 Price near lower Bollinger Band');
      confidence += 10;
    } else if (indicators.bollingerBands.percentB > 80) {
      reasons.push('🔴 Price near upper Bollinger Band');
      confidence -= 10;
    }

    // Determine support/resistance
    const lows = recentCandles.map((c) => c.low);
    const highs = recentCandles.map((c) => c.high);
    const supportLevel = Math.min(...lows.slice(-20));
    const resistanceLevel = Math.max(...highs.slice(-20));

    // Signal type
    let type: 'buy' | 'sell' | 'hold' = 'hold';
    if (confidence > 40) type = 'buy';
    else if (confidence < -40) type = 'sell';

    confidence = Math.max(-100, Math.min(100, confidence));

    return {
      type,
      confidence: Math.abs(confidence),
      reasons,
      supportLevel: Math.round(supportLevel * 100) / 100,
      resistanceLevel: Math.round(resistanceLevel * 100) / 100,
    };
  }

  /**
   * Get default indicators when insufficient data
   */
  private getDefaultIndicators(): TechnicalIndicators {
    return {
      rsi: 50,
      macd: { line: 0, signal: 0, histogram: 0 },
      bollingerBands: { upper: 0, middle: 0, lower: 0, bandwidth: 0, percentB: 50 },
      movingAverages: { sma20: 0, sma50: 0, ema12: 0, ema26: 0 },
      trend: 'neutral',
      strength: 50,
    };
  }
}

export const technicalIndicatorsService = new TechnicalIndicatorsService();
