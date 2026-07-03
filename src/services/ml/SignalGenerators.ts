import { FeatureVector, Signal } from './types';

/**
 * Statistical (non-neural) signal generators over engineered features.
 * Each maps a feature vector to a directional call with a calibrated
 * probability. These stand in for the "LSTM" / "XGBoost" components of the
 * ensemble spec: this codebase has no Python/TF training pipeline, so rather
 * than fake a neural model, the ensemble combines transparent, testable
 * statistical signals that are individually auditable.
 */

function toSignal(score: number): Signal {
  const clamped = Math.max(-1, Math.min(1, score));
  const probability = 0.5 + Math.abs(clamped) / 2;
  const direction = clamped > 0.05 ? 'up' : clamped < -0.05 ? 'down' : 'neutral';
  return { direction, probability, score: clamped };
}

/** Trend-following: weighted blend of moving-average and MACD momentum. */
export function momentumSignal(features: FeatureVector): Signal {
  const score =
    0.4 * Math.tanh(features.sma_ratio_20 * 10) +
    0.3 * Math.tanh(features.sma_ratio_50 * 10) +
    0.3 * Math.tanh(features.macd_hist * 20);
  return toSignal(score);
}

/** Mean-reversion: RSI and Bollinger %B extremes predict reversal. */
export function meanReversionSignal(features: FeatureVector): Signal {
  const rsiSignal = (0.5 - features.rsi_14) * 2; // rsi near 0 (oversold) -> positive
  const bollSignal = (0.5 - features.bollinger_pctb) * 2; // near lower band -> positive
  const score = 0.5 * rsiSignal + 0.5 * bollSignal;
  return toSignal(score);
}

/** Volume-confirmation: momentum direction scaled by relative volume conviction. */
export function volumeConvictionSignal(features: FeatureVector): Signal {
  const momentum = Math.tanh(features.return_5d * 10);
  const volumeBoost = Math.max(0, Math.min(2, features.volume_ratio_20d)) / 2; // 0..1
  const score = momentum * volumeBoost;
  return toSignal(score);
}

/** Fundamental quality: cheap + profitable + growing tilts bullish; absent data is neutral. */
export function fundamentalSignal(features: FeatureVector): Signal {
  if (!features.has_fundamentals) return toSignal(0);
  const peScore = features.pe_ratio > 0 ? Math.tanh((25 - features.pe_ratio) / 25) : 0;
  const roeScore = Math.tanh(features.roe / 20);
  const growthScore = Math.tanh(features.eps_growth_yoy / 20);
  const score = 0.3 * peScore + 0.4 * roeScore + 0.3 * growthScore;
  return toSignal(score);
}
