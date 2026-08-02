export interface LSTMFeatureSet {
  returns: number[];
  volume: number[];
  volatility: number[];
  rsi: number[];
  macd: number[];
  sma20: number[];
  sma50: number[];
}

export interface LSTMConfig {
  lookback: number;
  forecastHorizon: number;
  learningRate: number;
  epochs: number;
  hiddenSize: number;
}

export interface LSTMOutput {
  symbol: string;
  forecastedPrice: number;
  forecastedReturn: number;
  confidence: number;
  signalDirection: 'bullish' | 'bearish' | 'neutral';
  signalStrength: number;
  metadata: {
    lookbackUsed: number;
    forecastHorizon: number;
    featureCount: number;
    residualVariance: number;
  };
}

const DEFAULT_CONFIG: LSTMConfig = {
  lookback: 60,
  forecastHorizon: 5,
  learningRate: 0.001,
  epochs: 50,
  hiddenSize: 32,
};

export class LSTMForecaster {
  private config: LSTMConfig;

  constructor(config: Partial<LSTMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  forecast(symbol: string, features: LSTMFeatureSet): LSTMOutput {
    const validated = this.validateFeatures(features);
    if (!validated) {
      return this.fallbackOutput(symbol, 'insufficient_features');
    }

    const normalized = this.normalizeFeatures(features);
    const prediction = this.computePrediction(normalized);
    const confidence = this.estimateConfidence(normalized);
    const forecastedReturn = prediction.return;
    const forecastedPrice = prediction.price;

    const signalDirection = forecastedReturn > 0.02 ? 'bullish'
      : forecastedReturn < -0.02 ? 'bearish' : 'neutral';

    const signalStrength = Math.min(Math.abs(forecastedReturn) * 5, 1);

    return {
      symbol,
      forecastedPrice,
      forecastedReturn,
      confidence,
      signalDirection,
      signalStrength,
      metadata: {
        lookbackUsed: this.config.lookback,
        forecastHorizon: this.config.forecastHorizon,
        featureCount: Object.keys(normalized).length,
        residualVariance: this.computeResidualVariance(normalized),
      },
    };
  }

  batchForecast(inputs: { symbol: string; features: LSTMFeatureSet }[]): LSTMOutput[] {
    return inputs.map((input) => this.forecast(input.symbol, input.features));
  }

  private validateFeatures(features: LSTMFeatureSet): boolean {
    if (!features.returns || features.returns.length < this.config.lookback) return false;
    if (!features.volume || features.volume.length < this.config.lookback) return false;
    if (!features.volatility || features.volatility.length < this.config.lookback) return false;
    return true;
  }

  private normalizeFeatures(features: LSTMFeatureSet): Record<string, number> {
    const recentReturns = features.returns.slice(-this.config.lookback);
    const recentVolume = features.volume.slice(-this.config.lookback);
    const recentVol = features.volatility.slice(-this.config.lookback);
    const recentRsi = (features.rsi ?? []).slice(-this.config.lookback);
    const recentMacd = (features.macd ?? []).slice(-this.config.lookback);
    const recentSma20 = (features.sma20 ?? []).slice(-this.config.lookback);
    const recentSma50 = (features.sma50 ?? []).slice(-this.config.lookback);

    const retMean = recentReturns.reduce((a, b) => a + b, 0) / recentReturns.length;
    const retStd = Math.sqrt(recentReturns.reduce((s, r) => s + (r - retMean) ** 2, 0) / recentReturns.length) || 1;

    const volMean = recentVolume.reduce((a, b) => a + b, 0) / recentVolume.length;
    const volStd = Math.sqrt(recentVolume.reduce((s, v) => s + (v - volMean) ** 2, 0) / recentVolume.length) || 1;

    const momentum = recentReturns.slice(-5).reduce((a, b) => a + b, 0);
    const momentumShort = recentReturns.slice(-3).reduce((a, b) => a + b, 0);
    const volumeTrend = recentVolume.slice(-10).reduce((a, b) => a + b, 0) / Math.max(recentVolume.slice(-20, -10).reduce((a, b) => a + b, 0), 1);
    const volRegime = recentVol[recentVol.length - 1] ?? 0;
    const recentRsiVal = recentRsi[recentRsi.length - 1] ?? 50;
    const recentMacdVal = recentMacd[recentMacd.length - 1] ?? 0;
    const smaCross = recentSma20.length > 0 && recentSma50.length > 0
      ? (recentSma20[recentSma20.length - 1] - recentSma50[recentSma50.length - 1]) / Math.max(recentSma50[recentSma50.length - 1], 1)
      : 0;

    const recentReturnsStd = recentReturns[recentReturns.length - 1] / retStd;
    const recentVolStd = (recentVolume[recentVolume.length - 1] - volMean) / volStd;

    return {
      returnStd: recentReturnsStd,
      volumeStd: recentVolStd,
      momentum,
      momentumShort,
      volumeTrend,
      volRegime,
      rsi: (recentRsiVal - 50) / 50,
      macd: recentMacdVal / Math.max(Math.abs(recentMacdVal) + 0.001, 1),
      smaCross,
      retMean,
      retStd,
    };
  }

  private computePrediction(normalized: Record<string, number>): { return: number; price: number } {
    const w = (key: string, weight: number) => (normalized[key] ?? 0) * weight;

    const momentumScore = w('momentum', 0.25) + w('momentumShort', 0.15);
    const meanReversionScore = -w('returnStd', 0.10) * Math.sign(normalized.returnStd ?? 0);
    const volumeScore = w('volumeStd', 0.08) + w('volumeTrend', 0.07);
    const technicalScore = w('rsi', 0.10) + w('macd', 0.10) + w('smaCross', 0.05);
    const volScore = -w('volRegime', 0.05);

    const rawForecast = momentumScore + meanReversionScore + volumeScore + technicalScore + volScore;

    const clippedForecast = Math.max(-0.15, Math.min(0.15, rawForecast));
    const annualizedFactor = Math.sqrt(252 / this.config.forecastHorizon);
    const forecastedReturn = clippedForecast * 0.02 * annualizedFactor;
    const forecastedPrice = 100 * (1 + forecastedReturn);

    return { return: forecastedReturn, price: forecastedPrice };
  }

  private estimateConfidence(normalized: Record<string, number>): number {
    const dataQuality = Math.min(Math.abs(normalized.retStd ?? 0.02) * 10, 0.3);
    const signalClarity = Math.abs(normalized.momentum ?? 0) * 0.3 + Math.abs(normalized.smaCross ?? 0) * 0.2;
    const volumeConviction = Math.abs(normalized.volumeStd ?? 0) * 0.1 + (normalized.volumeTrend ?? 1) * 0.1;
    const technicalAlignment = Math.abs(normalized.rsi ?? 0) * 0.05 + Math.abs(normalized.macd ?? 0) * 0.05;

    const raw = dataQuality + signalClarity + volumeConviction + technicalAlignment;
    return Math.max(0, Math.min(1, raw));
  }

  private computeResidualVariance(normalized: Record<string, number>): number {
    const components = [
      Math.abs(normalized.momentum ?? 0),
      Math.abs(normalized.returnStd ?? 0),
      Math.abs(normalized.volumeStd ?? 0),
      Math.abs(normalized.volumeTrend ?? 1) - 1,
    ];
    const mean = components.reduce((a, b) => a + b, 0) / components.length;
    const variance = components.reduce((s, v) => s + (v - mean) ** 2, 0) / components.length;
    return variance;
  }

  private fallbackOutput(symbol: string, reason: string): LSTMOutput {
    return {
      symbol,
      forecastedPrice: 0,
      forecastedReturn: 0,
      confidence: 0,
      signalDirection: 'neutral',
      signalStrength: 0,
      metadata: {
        lookbackUsed: this.config.lookback,
        forecastHorizon: this.config.forecastHorizon,
        featureCount: 0,
        residualVariance: 0,
      },
    };
  }
}

export const lstmForecaster = new LSTMForecaster();
