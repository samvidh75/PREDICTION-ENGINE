import { UnifiedFeatureValue, UnifiedFactorScore, UnifiedFactorGroup } from '../types';

export interface FactorGroupDefinition {
  group: UnifiedFactorGroup;
  weight: number;
  featureIds: string[];
  score: (features: Map<string, UnifiedFeatureValue>) => UnifiedFactorScore;
}

function scoreFromBreakpoints(
  value: number,
  breakpoints: Array<{ x: number; y: number }>
): number {
  if (breakpoints.length === 0) return 50;
  const sorted = [...breakpoints].sort((a, b) => a.x - b.x);
  if (value <= sorted[0].x) return sorted[0].y;
  if (value >= sorted[sorted.length - 1].x) return sorted[sorted.length - 1].y;
  for (let i = 0; i < sorted.length - 1; i++) {
    const lo = sorted[i];
    const hi = sorted[i + 1];
    if (value >= lo.x && value <= hi.x) {
      if (hi.x === lo.x) return lo.y;
      const t = (value - lo.x) / (hi.x - lo.x);
      return lo.y + t * (hi.y - lo.y);
    }
  }
  return sorted[sorted.length - 1].y;
}

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function featureValue(features: Map<string, UnifiedFeatureValue>, id: string): number | null {
  return features.get(id)?.transformed ?? null;
}

function featureConfidence(features: Map<string, UnifiedFeatureValue>, id: string): number | null {
  return features.get(id)?.confidence ?? null;
}

function buildGroupScore(
  group: UnifiedFactorGroup,
  features: Map<string, UnifiedFeatureValue>,
  featureIds: string[],
  breakpointMap: Record<string, Array<{ x: number; y: number }>>,
  reasonLabel: string
): UnifiedFactorScore {
  const scores: number[] = [];
  const confidences: number[] = [];
  const missing: string[] = [];

  for (const id of featureIds) {
    const val = featureValue(features, id);
    if (val !== null) {
      const bp = breakpointMap[id];
      if (bp) {
        scores.push(clampScore(scoreFromBreakpoints(val, bp)));
      }
      const cf = featureConfidence(features, id);
      if (cf !== null) confidences.push(cf);
    } else {
      missing.push(id);
    }
  }

  const featureCount = featureIds.length;
  const availableFeatureCount = featureCount - missing.length;
  const availability = featureCount > 0 ? (availableFeatureCount / featureCount) * 100 : 0;
  const confidence = confidences.length > 0
    ? clampScore(confidences.reduce((a, b) => a * b, 1) * 100)
    : 0;
  const value = scores.length > 0
    ? clampScore(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return {
    group,
    value,
    availability: clampScore(availability),
    confidence,
    featureCount,
    availableFeatureCount,
    missingFeatures: missing,
    reason: scores.length > 0
      ? `${reasonLabel}: ${scores.length} metrics averaged`
      : `No ${reasonLabel.toLowerCase()} data available`,
  };
}

// ─── Quality group ────────────────────────────────────────────────

const QUALITY_FEATURES = [
  'roe', 'roa', 'roic', 'gross_margin',
  'operating_margin', 'net_margin', 'debt_to_equity', 'current_ratio',
];

const QUALITY_BPS: Record<string, Array<{ x: number; y: number }>> = {
  roe:               [{ x: 0, y: 0 }, { x: 5, y: 25 }, { x: 10, y: 50 }, { x: 20, y: 75 }, { x: 30, y: 100 }],
  roa:               [{ x: 0, y: 0 }, { x: 3, y: 25 }, { x: 5, y: 50 }, { x: 10, y: 75 }, { x: 20, y: 100 }],
  roic:              [{ x: 0, y: 0 }, { x: 5, y: 25 }, { x: 10, y: 50 }, { x: 20, y: 75 }, { x: 30, y: 100 }],
  gross_margin:      [{ x: 0, y: 0 }, { x: 20, y: 30 }, { x: 40, y: 60 }, { x: 60, y: 85 }, { x: 80, y: 100 }],
  operating_margin:  [{ x: 0, y: 0 }, { x: 5, y: 25 }, { x: 10, y: 50 }, { x: 20, y: 75 }, { x: 30, y: 100 }],
  net_margin:        [{ x: 0, y: 0 }, { x: 3, y: 20 }, { x: 8, y: 50 }, { x: 15, y: 75 }, { x: 25, y: 100 }],
  debt_to_equity:    [{ x: 0.1, y: 100 }, { x: 0.5, y: 75 }, { x: 1, y: 50 }, { x: 2, y: 25 }, { x: 3, y: 0 }],
  current_ratio:     [{ x: 0.5, y: 0 }, { x: 1, y: 30 }, { x: 1.5, y: 60 }, { x: 2, y: 80 }, { x: 3, y: 100 }],
};

export function scoreQualityGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('quality', features, QUALITY_FEATURES, QUALITY_BPS, 'Quality');
}

// ─── Valuation group ──────────────────────────────────────────────

const VALUATION_FEATURES = [
  'pe_ratio', 'pb_ratio', 'fcf_yield', 'ev_ebitda', 'dividend_yield',
];

const VALUATION_BPS: Record<string, Array<{ x: number; y: number }>> = {
  pe_ratio:       [{ x: 5, y: 100 }, { x: 15, y: 75 }, { x: 25, y: 50 }, { x: 50, y: 25 }, { x: 100, y: 0 }],
  pb_ratio:       [{ x: 0.5, y: 100 }, { x: 1, y: 75 }, { x: 2, y: 50 }, { x: 5, y: 25 }, { x: 10, y: 0 }],
  fcf_yield:      [{ x: 0, y: 0 }, { x: 2, y: 30 }, { x: 5, y: 60 }, { x: 10, y: 80 }, { x: 20, y: 100 }],
  ev_ebitda:      [{ x: 5, y: 100 }, { x: 10, y: 75 }, { x: 15, y: 50 }, { x: 25, y: 30 }, { x: 50, y: 0 }],
  dividend_yield: [{ x: 0, y: 50 }, { x: 1, y: 60 }, { x: 2, y: 75 }, { x: 5, y: 90 }, { x: 10, y: 30 }],
};

export function scoreValuationGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('valuation', features, VALUATION_FEATURES, VALUATION_BPS, 'Valuation');
}

// ─── Growth group ─────────────────────────────────────────────────

const GROWTH_FEATURES = [
  'revenue_growth', 'profit_growth', 'eps_growth', 'fcf_growth',
];

const GROWTH_BPS: Record<string, Array<{ x: number; y: number }>> = {
  revenue_growth: [{ x: -20, y: 0 }, { x: -10, y: 20 }, { x: 0, y: 40 }, { x: 10, y: 65 }, { x: 20, y: 85 }, { x: 50, y: 100 }],
  profit_growth:  [{ x: -30, y: 0 }, { x: -10, y: 20 }, { x: 0, y: 45 }, { x: 15, y: 70 }, { x: 30, y: 90 }, { x: 50, y: 100 }],
  eps_growth:     [{ x: -30, y: 0 }, { x: -10, y: 20 }, { x: 0, y: 45 }, { x: 15, y: 70 }, { x: 30, y: 90 }, { x: 50, y: 100 }],
  fcf_growth:     [{ x: -30, y: 0 }, { x: -10, y: 20 }, { x: 0, y: 40 }, { x: 15, y: 65 }, { x: 30, y: 85 }, { x: 50, y: 100 }],
};

export function scoreGrowthGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('growth', features, GROWTH_FEATURES, GROWTH_BPS, 'Growth');
}

// ─── Stability group ──────────────────────────────────────────────

const STABILITY_FEATURES = [
  'beta', 'volatility_20d', 'bollinger_width', 'debt_to_equity',
];

const STABILITY_BPS: Record<string, Array<{ x: number; y: number }>> = {
  beta:             [{ x: 0, y: 100 }, { x: 0.5, y: 80 }, { x: 1, y: 60 }, { x: 1.5, y: 30 }, { x: 2, y: 0 }],
  volatility_20d:   [{ x: 1, y: 100 }, { x: 2, y: 80 }, { x: 4, y: 60 }, { x: 6, y: 30 }, { x: 10, y: 0 }],
  bollinger_width:  [{ x: 3, y: 100 }, { x: 5, y: 80 }, { x: 10, y: 60 }, { x: 15, y: 30 }, { x: 20, y: 0 }],
  debt_to_equity:   [{ x: 0.1, y: 100 }, { x: 0.5, y: 75 }, { x: 1, y: 50 }, { x: 2, y: 25 }, { x: 3, y: 0 }],
};

export function scoreStabilityGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('stability', features, STABILITY_FEATURES, STABILITY_BPS, 'Stability');
}

// ─── Momentum group ───────────────────────────────────────────────

const MOMENTUM_FEATURES = [
  'momentum_factor', 'return_1d', 'return_5d', 'return_20d', 'rsi', 'relative_strength',
];

const MOMENTUM_BPS: Record<string, Array<{ x: number; y: number }>> = {
  momentum_factor:   [],
  return_1d:         [{ x: -5, y: 0 }, { x: -2, y: 30 }, { x: 0, y: 55 }, { x: 2, y: 75 }, { x: 5, y: 100 }],
  return_5d:         [{ x: -10, y: 0 }, { x: -5, y: 30 }, { x: 0, y: 55 }, { x: 5, y: 75 }, { x: 10, y: 100 }],
  return_20d:        [{ x: -20, y: 0 }, { x: -10, y: 30 }, { x: 0, y: 55 }, { x: 10, y: 75 }, { x: 20, y: 100 }],
  rsi:               [{ x: 20, y: 0 }, { x: 30, y: 30 }, { x: 45, y: 50 }, { x: 60, y: 70 }, { x: 75, y: 90 }, { x: 85, y: 100 }],
  relative_strength: [{ x: 0.5, y: 0 }, { x: 0.75, y: 25 }, { x: 1, y: 50 }, { x: 1.3, y: 75 }, { x: 1.6, y: 100 }],
};

export function scoreMomentumGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  const featureIds = MOMENTUM_FEATURES;
  const scores: number[] = [];
  const confidences: number[] = [];
  const missing: string[] = [];

  for (const id of featureIds) {
    const val = featureValue(features, id);
    if (val !== null) {
      if (id === 'momentum_factor') {
        scores.push(clampScore(val));
      } else {
        const bp = MOMENTUM_BPS[id];
        if (bp && bp.length > 0) {
          scores.push(clampScore(scoreFromBreakpoints(val, bp)));
        }
      }
      const cf = featureConfidence(features, id);
      if (cf !== null) confidences.push(cf);
    } else {
      missing.push(id);
    }
  }

  const featureCount = featureIds.length;
  const availableFeatureCount = featureCount - missing.length;
  const availability = featureCount > 0 ? (availableFeatureCount / featureCount) * 100 : 0;
  const confidence = confidences.length > 0
    ? clampScore(confidences.reduce((a, b) => a * b, 1) * 100)
    : 0;
  const value = scores.length > 0
    ? clampScore(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return {
    group: 'momentum',
    value,
    availability: clampScore(availability),
    confidence,
    featureCount,
    availableFeatureCount,
    missingFeatures: missing,
    reason: scores.length > 0
      ? `Momentum: ${scores.length} metrics averaged`
      : 'No momentum data available',
  };
}

// ─── Risk group ───────────────────────────────────────────────────

const RISK_FEATURES = [
  'beta', 'volatility_20d', 'atr', 'debt_to_equity',
];

const RISK_BPS: Record<string, Array<{ x: number; y: number }>> = {
  beta:            [{ x: 0, y: 100 }, { x: 0.5, y: 80 }, { x: 1, y: 50 }, { x: 1.5, y: 30 }, { x: 2, y: 0 }],
  volatility_20d:  [{ x: 1, y: 100 }, { x: 2, y: 80 }, { x: 4, y: 50 }, { x: 6, y: 30 }, { x: 10, y: 0 }],
  debt_to_equity:  [{ x: 0.1, y: 100 }, { x: 0.5, y: 80 }, { x: 1, y: 60 }, { x: 2, y: 30 }, { x: 3, y: 0 }],
};

export function scoreRiskGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  const featureIds = RISK_FEATURES;
  const scores: number[] = [];
  const confidences: number[] = [];
  const missing: string[] = [];

  for (const id of featureIds) {
    const val = featureValue(features, id);
    if (val !== null) {
      const bp = RISK_BPS[id];
      if (bp) {
        scores.push(clampScore(scoreFromBreakpoints(val, bp)));
      }
      const cf = featureConfidence(features, id);
      if (cf !== null) confidences.push(cf);
    } else {
      missing.push(id);
    }
  }

  const featureCount = featureIds.length;
  const availableFeatureCount = featureCount - missing.length;
  const availability = featureCount > 0 ? (availableFeatureCount / featureCount) * 100 : 0;
  const confidence = confidences.length > 0
    ? clampScore(confidences.reduce((a, b) => a * b, 1) * 100)
    : 0;
  const value = scores.length > 0
    ? clampScore(scores.reduce((a, b) => a + b, 0) / scores.length)
    : null;

  return {
    group: 'risk',
    value,
    availability: clampScore(availability),
    confidence,
    featureCount,
    availableFeatureCount,
    missingFeatures: missing,
    reason: scores.length > 0
      ? `Risk: ${scores.length} metrics averaged (inverted: lower risk scores higher)`
      : 'No risk data available',
  };
}

// ─── Sector group ─────────────────────────────────────────────────

const SECTOR_FEATURES = [
  'sector_strength', 'sector_pe_relative', 'sector_growth_relative',
];

const SECTOR_BPS: Record<string, Array<{ x: number; y: number }>> = {
  sector_strength:       [{ x: 0, y: 0 }, { x: 25, y: 30 }, { x: 50, y: 55 }, { x: 75, y: 80 }, { x: 100, y: 100 }],
  sector_pe_relative:    [{ x: 0.3, y: 100 }, { x: 0.6, y: 75 }, { x: 1, y: 50 }, { x: 1.5, y: 25 }, { x: 3, y: 0 }],
  sector_growth_relative: [{ x: 0, y: 0 }, { x: 0.5, y: 30 }, { x: 1, y: 50 }, { x: 1.5, y: 75 }, { x: 3, y: 100 }],
};

export function scoreSectorGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('sector', features, SECTOR_FEATURES, SECTOR_BPS, 'Sector');
}

// ─── Liquidity group ──────────────────────────────────────────────

const LIQUIDITY_FEATURES = [
  'volume', 'turnover_ratio', 'current_ratio',
];

const LIQUIDITY_BPS: Record<string, Array<{ x: number; y: number }>> = {
  volume:          [{ x: 0, y: 0 }, { x: 100000, y: 20 }, { x: 500000, y: 50 }, { x: 2000000, y: 75 }, { x: 10000000, y: 100 }],
  turnover_ratio:  [{ x: 0, y: 0 }, { x: 0.2, y: 30 }, { x: 0.5, y: 60 }, { x: 1, y: 80 }, { x: 3, y: 100 }],
  current_ratio:   [{ x: 0.5, y: 0 }, { x: 1, y: 30 }, { x: 1.5, y: 60 }, { x: 2, y: 80 }, { x: 3, y: 100 }],
};

export function scoreLiquidityGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('liquidity', features, LIQUIDITY_FEATURES, LIQUIDITY_BPS, 'Liquidity');
}

// ─── Ownership group ──────────────────────────────────────────────

const OWNERSHIP_FEATURES = [
  'promoter_holding', 'institutional_holding', 'public_holding',
];

const OWNERSHIP_BPS: Record<string, Array<{ x: number; y: number }>> = {
  promoter_holding:      [{ x: 0, y: 0 }, { x: 25, y: 40 }, { x: 50, y: 65 }, { x: 75, y: 85 }, { x: 100, y: 100 }],
  institutional_holding: [{ x: 0, y: 0 }, { x: 10, y: 30 }, { x: 25, y: 60 }, { x: 50, y: 80 }, { x: 100, y: 100 }],
  public_holding:        [{ x: 0, y: 100 }, { x: 25, y: 70 }, { x: 50, y: 40 }, { x: 75, y: 20 }, { x: 100, y: 0 }],
};

export function scoreOwnershipGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('ownership', features, OWNERSHIP_FEATURES, OWNERSHIP_BPS, 'Ownership');
}

// ─── Events group ─────────────────────────────────────────────────

const EVENTS_FEATURES = [
  'dividend_count_12m', 'split_count_12m', 'bonus_count_12m', 'has_corporate_action_90d',
];

const EVENTS_BPS: Record<string, Array<{ x: number; y: number }>> = {
  dividend_count_12m:       [{ x: 0, y: 30 }, { x: 1, y: 50 }, { x: 2, y: 70 }, { x: 4, y: 90 }, { x: 6, y: 100 }],
  split_count_12m:          [{ x: 0, y: 70 }, { x: 1, y: 50 }, { x: 2, y: 30 }, { x: 3, y: 10 }, { x: 5, y: 0 }],
  bonus_count_12m:          [{ x: 0, y: 70 }, { x: 1, y: 50 }, { x: 2, y: 30 }, { x: 3, y: 10 }, { x: 5, y: 0 }],
  has_corporate_action_90d: [{ x: 0, y: 100 }, { x: 0.5, y: 50 }, { x: 1, y: 0 }],
};

export function scoreEventsGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('events', features, EVENTS_FEATURES, EVENTS_BPS, 'Events');
}

// ─── Data Quality group ───────────────────────────────────────────

const DATA_QUALITY_FEATURES = [
  'feature_freshness', 'data_completeness', 'provider_count', 'source_confidence',
];

const DATA_QUALITY_BPS: Record<string, Array<{ x: number; y: number }>> = {
  feature_freshness: [{ x: 0, y: 0 }, { x: 30, y: 40 }, { x: 60, y: 70 }, { x: 80, y: 90 }, { x: 100, y: 100 }],
  data_completeness: [{ x: 0, y: 0 }, { x: 30, y: 30 }, { x: 60, y: 60 }, { x: 80, y: 85 }, { x: 100, y: 100 }],
  provider_count:    [{ x: 0, y: 0 }, { x: 1, y: 30 }, { x: 2, y: 60 }, { x: 3, y: 80 }, { x: 5, y: 100 }],
  source_confidence: [{ x: 0, y: 0 }, { x: 30, y: 30 }, { x: 60, y: 60 }, { x: 80, y: 85 }, { x: 100, y: 100 }],
};

export function scoreDataQualityGroup(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore {
  return buildGroupScore('dataQuality', features, DATA_QUALITY_FEATURES, DATA_QUALITY_BPS, 'DataQuality');
}

// ─── Group definitions & composite runner ─────────────────────────

export const FACTOR_GROUP_DEFINITIONS: FactorGroupDefinition[] = [
  { group: 'quality',     weight: 0.20, featureIds: QUALITY_FEATURES,     score: scoreQualityGroup },
  { group: 'valuation',   weight: 0.15, featureIds: VALUATION_FEATURES,   score: scoreValuationGroup },
  { group: 'growth',      weight: 0.20, featureIds: GROWTH_FEATURES,      score: scoreGrowthGroup },
  { group: 'stability',   weight: 0.10, featureIds: STABILITY_FEATURES,   score: scoreStabilityGroup },
  { group: 'momentum',    weight: 0.15, featureIds: MOMENTUM_FEATURES,    score: scoreMomentumGroup },
  { group: 'risk',        weight: 0.00, featureIds: RISK_FEATURES,        score: scoreRiskGroup },
  { group: 'sector',      weight: 0.05, featureIds: SECTOR_FEATURES,      score: scoreSectorGroup },
  { group: 'liquidity',   weight: 0.05, featureIds: LIQUIDITY_FEATURES,   score: scoreLiquidityGroup },
  { group: 'ownership',   weight: 0.05, featureIds: OWNERSHIP_FEATURES,   score: scoreOwnershipGroup },
  { group: 'events',      weight: 0.00, featureIds: EVENTS_FEATURES,      score: scoreEventsGroup },
  { group: 'dataQuality', weight: 0.10, featureIds: DATA_QUALITY_FEATURES, score: scoreDataQualityGroup },
];

export function computeAllFactorScores(features: Map<string, UnifiedFeatureValue>): UnifiedFactorScore[] {
  return FACTOR_GROUP_DEFINITIONS.map((def) => def.score(features));
}
