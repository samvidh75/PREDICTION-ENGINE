// src/systems/market-brain/technicalReliability.ts
// Phase 5 – deterministic technical feature reliability review.
//
// This module validates already-computed technical features before they are used
// by Market Brain research logic. It does not fetch data, call providers, call
// LLMs, create predictions, or produce recommendation language.

export interface TechnicalFeatureSnapshot {
  rsi?: number | null;
  macd?: number | null;
  macdSignal?: number | null;
  macdHistogram?: number | null;
  adx?: number | null;
  atr?: number | null;
  momentum?: number | null;
  volatility?: number | null;
  volumeMultiple?: number | null;
  relativeStrength?: number | null;
}

export interface TechnicalReliabilityReview {
  usable: boolean;
  available: string[];
  partial: string[];
  missing: string[];
  rejected: string[];
  warnings: string[];
}

type TechnicalFeatureKey = keyof TechnicalFeatureSnapshot;

const FEATURE_KEYS: TechnicalFeatureKey[] = [
  'rsi',
  'macd',
  'macdSignal',
  'macdHistogram',
  'adx',
  'atr',
  'momentum',
  'volatility',
  'volumeMultiple',
  'relativeStrength',
];

const CORE_FEATURES: TechnicalFeatureKey[] = [
  'rsi',
  'macd',
  'adx',
  'atr',
  'momentum',
  'volatility',
];

const FEATURE_LABELS: Record<TechnicalFeatureKey, string> = {
  rsi: 'rsi',
  macd: 'macd',
  macdSignal: 'macdSignal',
  macdHistogram: 'macdHistogram',
  adx: 'adx',
  atr: 'atr',
  momentum: 'momentum',
  volatility: 'volatility',
  volumeMultiple: 'volumeMultiple',
  relativeStrength: 'relativeStrength',
};

const UNSAFE_COPY = [
  'buy',
  'sell',
  'hold',
  'strong buy',
  'sure shot',
  'guaranteed',
  'multibagger',
  'provider',
  'api',
  'backend',
  'diagnostic',
  'coverage',
  'freshness',
  'lineage',
  'migration',
  'backfill',
];

function isMissing(value: number | null | undefined): boolean {
  return value == null;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidFeature(key: TechnicalFeatureKey, value: number | null | undefined): boolean {
  if (!finite(value)) return false;

  switch (key) {
    case 'rsi':
    case 'adx':
      return value >= 0 && value <= 100;
    case 'atr':
    case 'volatility':
    case 'volumeMultiple':
      return value >= 0;
    case 'macd':
    case 'macdSignal':
    case 'macdHistogram':
    case 'momentum':
    case 'relativeStrength':
      return true;
    default:
      return false;
  }
}

function ensureSafeCopy(review: TechnicalReliabilityReview): void {
  const text = [
    ...review.available,
    ...review.partial,
    ...review.missing,
    ...review.rejected,
    ...review.warnings,
  ].join(' ').toLowerCase();

  for (const term of UNSAFE_COPY) {
    if (text.includes(term)) {
      throw new Error(`Unsafe technical reliability copy: ${term}`);
    }
  }
}

export function reviewTechnicalReliability(
  snapshot: TechnicalFeatureSnapshot | null | undefined,
): TechnicalReliabilityReview {
  const available: string[] = [];
  const missing: string[] = [];
  const rejected: string[] = [];
  const warnings: string[] = [];

  for (const key of FEATURE_KEYS) {
    const value = snapshot?.[key];
    const label = FEATURE_LABELS[key];

    if (isMissing(value)) {
      missing.push(label);
      continue;
    }

    if (isValidFeature(key, value)) {
      available.push(label);
      continue;
    }

    rejected.push(label);
  }

  const missingCore = CORE_FEATURES.filter((key) => missing.includes(FEATURE_LABELS[key]));
  const rejectedCore = CORE_FEATURES.filter((key) => rejected.includes(FEATURE_LABELS[key]));
  const usable = available.length > 0 && rejectedCore.length === 0;

  if (missingCore.length > 0) {
    warnings.push('Technical review is incomplete.');
  }

  if (rejected.length > 0) {
    warnings.push('Some technical inputs were ignored.');
  }

  const review: TechnicalReliabilityReview = {
    usable,
    available: [...available],
    partial: missingCore.length > 0 && available.length > 0 ? missingCore.map((key) => FEATURE_LABELS[key]) : [],
    missing: [...missing],
    rejected: [...rejected],
    warnings: [...warnings],
  };

  ensureSafeCopy(review);
  return review;
}
