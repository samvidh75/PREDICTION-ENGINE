import { describe, it, expect } from 'vitest';
import { UnifiedFeatureValue } from '../types';
import {
  scoreQualityGroup,
  scoreValuationGroup,
  scoreGrowthGroup,
  scoreStabilityGroup,
  scoreMomentumGroup,
  scoreRiskGroup,
  scoreSectorGroup,
  scoreLiquidityGroup,
  scoreOwnershipGroup,
  scoreEventsGroup,
  scoreDataQualityGroup,
  computeAllFactorScores,
} from './FactorGroupScorer';
import { computeCompositeScore } from './CompositeScorer';
import { computeConfidence } from './ConfidenceScorer';
import { classifyScore, classificationLabel, classificationThresholds } from './ClassificationScorer';
import { evaluateMissingData } from './MissingDataPolicy';
import type { FeatureDefinition } from '../features/FeatureRegistry';

// ── Helpers ───────────────────────────────────────────────────────

function makeFeature(id: string, transformed: number | null, confidence = 0.9): UnifiedFeatureValue {
  return {
    id,
    label: id,
    raw: transformed,
    transformed,
    unit: '',
    sourceTable: '',
    sourceField: id,
    freshness: null,
    confidence,
    isStale: false,
  };
}

function makeMap(entries: Array<[string, number | null]>): Map<string, UnifiedFeatureValue> {
  const map = new Map<string, UnifiedFeatureValue>();
  for (const [id, val] of entries) {
    map.set(id, makeFeature(id, val));
  }
  return map;
}

// ── Quality Group ─────────────────────────────────────────────────

describe('scoreQualityGroup', () => {
  it('returns high score for high ROE/ROA/ROIC', () => {
    const f = makeMap([
      ['roe', 35], ['roa', 22], ['roic', 32],
      ['gross_margin', 85], ['operating_margin', 35],
      ['net_margin', 28], ['debt_to_equity', 0.08], ['current_ratio', 3.5],
    ]);
    const r = scoreQualityGroup(f);
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThanOrEqual(80);
    expect(r.availability).toBe(100);
    expect(r.missingFeatures).toHaveLength(0);
  });

  it('returns low score for low ROE/ROA/ROIC', () => {
    const f = makeMap([
      ['roe', -5], ['roa', -2], ['roic', -3],
      ['gross_margin', 5], ['operating_margin', 2],
      ['net_margin', 1], ['debt_to_equity', 5], ['current_ratio', 0.3],
    ]);
    const r = scoreQualityGroup(f);
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeLessThanOrEqual(25);
  });

  it('returns null when all features are missing', () => {
    const f = makeMap([
      ['roe', null], ['roa', null], ['roic', null],
      ['gross_margin', null], ['operating_margin', null],
      ['net_margin', null], ['debt_to_equity', null], ['current_ratio', null],
    ]);
    const r = scoreQualityGroup(f);
    expect(r.value).toBeNull();
    expect(r.availability).toBe(0);
    expect(r.missingFeatures).toHaveLength(8);
  });

  it('returns partial availability when some features are missing', () => {
    const f = makeMap([
      ['roe', 15], ['roa', null], ['roic', 18],
      ['gross_margin', null], ['operating_margin', 20],
      ['net_margin', null], ['debt_to_equity', 1], ['current_ratio', null],
    ]);
    const r = scoreQualityGroup(f);
    expect(r.value).not.toBeNull();
    expect(r.availability).toBe(50);
    expect(r.missingFeatures).toHaveLength(4);
    expect(r.availableFeatureCount).toBe(4);
  });

  it('high ROE beats low ROE', () => {
    const high = scoreQualityGroup(makeMap([
      ['roe', 35], ['roa', 15], ['roic', 25],
      ['gross_margin', 50], ['operating_margin', 20],
      ['net_margin', 15], ['debt_to_equity', 0.5], ['current_ratio', 2],
    ]));
    const low = scoreQualityGroup(makeMap([
      ['roe', -10], ['roa', -5], ['roic', -8],
      ['gross_margin', 10], ['operating_margin', 0],
      ['net_margin', -5], ['debt_to_equity', 4], ['current_ratio', 0.4],
    ]));
    expect(high.value!).toBeGreaterThan(low.value!);
  });
});

// ── Valuation Group ───────────────────────────────────────────────

describe('scoreValuationGroup', () => {
  it('returns null when all features missing', () => {
    const f = makeMap([
      ['pe_ratio', null], ['pb_ratio', null], ['fcf_yield', null],
      ['ev_ebitda', null], ['dividend_yield', null],
    ]);
    const r = scoreValuationGroup(f);
    expect(r.value).toBeNull();
    expect(r.availability).toBe(0);
  });

  it('cheap (low multiples) beats expensive', () => {
    const cheap = scoreValuationGroup(makeMap([
      ['pe_ratio', 8], ['pb_ratio', 0.6], ['fcf_yield', 12],
      ['ev_ebitda', 6], ['dividend_yield', 4],
    ]));
    const expensive = scoreValuationGroup(makeMap([
      ['pe_ratio', 80], ['pb_ratio', 8], ['fcf_yield', 0],
      ['ev_ebitda', 40], ['dividend_yield', 0],
    ]));
    expect(cheap.value!).toBeGreaterThan(expensive.value!);
  });

  it('returns valid 0-100 range', () => {
    const f = makeMap([
      ['pe_ratio', 15], ['pb_ratio', 2], ['fcf_yield', 5],
      ['ev_ebitda', 12], ['dividend_yield', 2],
    ]);
    const r = scoreValuationGroup(f);
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThanOrEqual(0);
    expect(r.value!).toBeLessThanOrEqual(100);
  });

  it('scores dividend_yield correctly (peaks around 5%)', () => {
    const moderate = scoreValuationGroup(makeMap([
      ['pe_ratio', 15], ['pb_ratio', 2], ['fcf_yield', 5],
      ['ev_ebitda', 12], ['dividend_yield', 5],
    ]));
    const tooHigh = scoreValuationGroup(makeMap([
      ['pe_ratio', 15], ['pb_ratio', 2], ['fcf_yield', 5],
      ['ev_ebitda', 12], ['dividend_yield', 15],
    ]));
    expect(moderate.value!).toBeGreaterThan(tooHigh.value!);
  });
});

// ── Growth Group ──────────────────────────────────────────────────

describe('scoreGrowthGroup', () => {
  it('returns null when all features missing', () => {
    const f = makeMap([
      ['revenue_growth', null], ['profit_growth', null],
      ['eps_growth', null], ['fcf_growth', null],
    ]);
    const r = scoreGrowthGroup(f);
    expect(r.value).toBeNull();
  });

  it('high growth beats low growth', () => {
    const high = scoreGrowthGroup(makeMap([
      ['revenue_growth', 40], ['profit_growth', 35],
      ['eps_growth', 30], ['fcf_growth', 25],
    ]));
    const low = scoreGrowthGroup(makeMap([
      ['revenue_growth', -15], ['profit_growth', -20],
      ['eps_growth', -25], ['fcf_growth', -20],
    ]));
    expect(high.value!).toBeGreaterThan(low.value!);
  });

  it('returns valid scores for mixed data', () => {
    const f = makeMap([
      ['revenue_growth', 10], ['profit_growth', null],
      ['eps_growth', 15], ['fcf_growth', null],
    ]);
    const r = scoreGrowthGroup(f);
    expect(r.value).not.toBeNull();
    expect(r.availableFeatureCount).toBe(2);
    expect(r.missingFeatures).toHaveLength(2);
  });
});

// ── Risk Group ────────────────────────────────────────────────────

describe('scoreRiskGroup', () => {
  it('scores low risk HIGH (inverted scoring)', () => {
    const lowRisk = scoreRiskGroup(makeMap([
      ['beta', 0.2], ['volatility_20d', 1.5], ['debt_to_equity', 0.05],
    ]));
    expect(lowRisk.value!).toBeGreaterThanOrEqual(80);
  });

  it('scores high risk LOW', () => {
    const highRisk = scoreRiskGroup(makeMap([
      ['beta', 3], ['volatility_20d', 12], ['debt_to_equity', 5],
    ]));
    expect(highRisk.value!).toBeLessThanOrEqual(15);
  });

  it('returns null when all risk features missing', () => {
    const f = makeMap([
      ['beta', null], ['volatility_20d', null],
      ['atr', null], ['debt_to_equity', null],
    ]);
    const r = scoreRiskGroup(f);
    expect(r.value).toBeNull();
  });
});

// ── Stability Group ───────────────────────────────────────────────

describe('scoreStabilityGroup', () => {
  it('low beta scores higher than high beta', () => {
    const stable = scoreStabilityGroup(makeMap([
      ['beta', 0.3], ['volatility_20d', 1.5],
      ['bollinger_width', 4], ['debt_to_equity', 0.2],
    ]));
    const unstable = scoreStabilityGroup(makeMap([
      ['beta', 1.8], ['volatility_20d', 9],
      ['bollinger_width', 18], ['debt_to_equity', 4],
    ]));
    expect(stable.value!).toBeGreaterThan(unstable.value!);
  });

  it('all missing returns null', () => {
    const r = scoreStabilityGroup(makeMap([
      ['beta', null], ['volatility_20d', null],
      ['bollinger_width', null], ['debt_to_equity', null],
    ]));
    expect(r.value).toBeNull();
  });
});

// ── Momentum Group ────────────────────────────────────────────────

describe('scoreMomentumGroup', () => {
  it('positive momentum scores higher than negative', () => {
    const pos = scoreMomentumGroup(makeMap([
      ['momentum_factor', 75], ['return_1d', 3], ['return_5d', 6],
      ['return_20d', 12], ['rsi', 60], ['relative_strength', 1.2],
    ]));
    const neg = scoreMomentumGroup(makeMap([
      ['momentum_factor', 20], ['return_1d', -4], ['return_5d', -8],
      ['return_20d', -15], ['rsi', 25], ['relative_strength', 0.6],
    ]));
    expect(pos.value!).toBeGreaterThan(neg.value!);
  });

  it('uses momentum_factor directly as score', () => {
    const f = makeMap([
      ['momentum_factor', 80], ['return_1d', null],
      ['return_5d', null], ['return_20d', null],
      ['rsi', null], ['relative_strength', null],
    ]);
    const r = scoreMomentumGroup(f);
    expect(r.value).toBe(80);
    expect(r.availableFeatureCount).toBe(1);
  });
});

// ── Sector Group ──────────────────────────────────────────────────

describe('scoreSectorGroup', () => {
  it('returns null when all missing', () => {
    const r = scoreSectorGroup(makeMap([
      ['sector_strength', null], ['sector_pe_relative', null],
      ['sector_growth_relative', null],
    ]));
    expect(r.value).toBeNull();
  });

  it('returns valid score with data', () => {
    const r = scoreSectorGroup(makeMap([
      ['sector_strength', 70], ['sector_pe_relative', null],
      ['sector_growth_relative', 1.2],
    ]));
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThanOrEqual(0);
    expect(r.value!).toBeLessThanOrEqual(100);
  });
});

// ── Liquidity Group ───────────────────────────────────────────────

describe('scoreLiquidityGroup', () => {
  it('returns null when all missing', () => {
    const r = scoreLiquidityGroup(makeMap([
      ['volume', null], ['turnover_ratio', null], ['current_ratio', null],
    ]));
    expect(r.value).toBeNull();
  });

  it('high volume and ratio scores well', () => {
    const r = scoreLiquidityGroup(makeMap([
      ['volume', 5_000_000], ['turnover_ratio', 1.5], ['current_ratio', 2],
    ]));
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThanOrEqual(50);
  });
});

// ── Ownership Group ───────────────────────────────────────────────

describe('scoreOwnershipGroup', () => {
  it('returns null when all missing', () => {
    const r = scoreOwnershipGroup(makeMap([
      ['promoter_holding', null], ['institutional_holding', null],
      ['public_holding', null],
    ]));
    expect(r.value).toBeNull();
  });

  it('high promoter holding scores well', () => {
    const r = scoreOwnershipGroup(makeMap([
      ['promoter_holding', 75], ['institutional_holding', 30],
      ['public_holding', 20],
    ]));
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThan(50);
  });
});

// ── Events Group ──────────────────────────────────────────────────

describe('scoreEventsGroup', () => {
  it('returns null when all missing', () => {
    const r = scoreEventsGroup(makeMap([
      ['dividend_count_12m', null], ['split_count_12m', null],
      ['bonus_count_12m', null], ['has_corporate_action_90d', null],
    ]));
    expect(r.value).toBeNull();
  });
});

// ── Data Quality Group ────────────────────────────────────────────

describe('scoreDataQualityGroup', () => {
  it('returns null when all missing', () => {
    const r = scoreDataQualityGroup(makeMap([
      ['feature_freshness', null], ['data_completeness', null],
      ['provider_count', null], ['source_confidence', null],
    ]));
    expect(r.value).toBeNull();
  });

  it('high freshness and completeness scores well', () => {
    const r = scoreDataQualityGroup(makeMap([
      ['feature_freshness', 90], ['data_completeness', 85],
      ['provider_count', 4], ['source_confidence', 90],
    ]));
    expect(r.value).not.toBeNull();
    expect(r.value!).toBeGreaterThanOrEqual(70);
  });
});

// ── computeAllFactorScores ────────────────────────────────────────

describe('computeAllFactorScores', () => {
  it('returns scores for all 11 factor groups', () => {
    const f = makeMap([
      ['roe', 15], ['roa', 10], ['roic', 12],
      ['gross_margin', 40], ['operating_margin', 15], ['net_margin', 10],
      ['debt_to_equity', 1], ['current_ratio', 1.5],
      ['pe_ratio', 15], ['pb_ratio', 2], ['fcf_yield', 5],
      ['ev_ebitda', 12], ['dividend_yield', 2],
      ['revenue_growth', 10], ['profit_growth', 15], ['eps_growth', 12],
      ['fcf_growth', 10], ['beta', 1], ['volatility_20d', 4],
      ['bollinger_width', 10], ['momentum_factor', 55],
      ['return_1d', 1], ['return_5d', 3], ['return_20d', 5],
      ['rsi', 55], ['relative_strength', 1.1],
      ['sector_strength', 60], ['sector_pe_relative', 1],
      ['sector_growth_relative', 1], ['volume', 1_500_000],
      ['turnover_ratio', 0.5], ['promoter_holding', 60],
      ['institutional_holding', 25], ['public_holding', 30],
      ['dividend_count_12m', 2], ['split_count_12m', 0],
      ['bonus_count_12m', 0], ['has_corporate_action_90d', 0],
      ['feature_freshness', 80], ['data_completeness', 75],
      ['provider_count', 2], ['source_confidence', 80],
    ]);
    const scores = computeAllFactorScores(f);
    expect(scores).toHaveLength(11);
    for (const s of scores) {
      expect(s.value).not.toBeNull();
      expect(s.value!).toBeGreaterThanOrEqual(0);
      expect(s.value!).toBeLessThanOrEqual(100);
    }
  });
});

// ── Composite Scorer ──────────────────────────────────────────────

describe('computeCompositeScore', () => {
  it('handles all-null factor scores gracefully', () => {
    const factorScores = [
      { group: 'quality' as const, value: null, availability: 0, confidence: 0, featureCount: 8, availableFeatureCount: 0, missingFeatures: ['roe'], reason: '' },
      { group: 'valuation' as const, value: null, availability: 0, confidence: 0, featureCount: 5, availableFeatureCount: 0, missingFeatures: ['pe_ratio'], reason: '' },
      { group: 'growth' as const, value: null, availability: 0, confidence: 0, featureCount: 4, availableFeatureCount: 0, missingFeatures: ['revenue_growth'], reason: '' },
      { group: 'stability' as const, value: null, availability: 0, confidence: 0, featureCount: 5, availableFeatureCount: 0, missingFeatures: ['beta'], reason: '' },
      { group: 'momentum' as const, value: null, availability: 0, confidence: 0, featureCount: 6, availableFeatureCount: 0, missingFeatures: ['momentum_factor'], reason: '' },
      { group: 'risk' as const, value: null, availability: 0, confidence: 0, featureCount: 4, availableFeatureCount: 0, missingFeatures: ['beta'], reason: '' },
      { group: 'sector' as const, value: null, availability: 0, confidence: 0, featureCount: 3, availableFeatureCount: 0, missingFeatures: ['sector_strength'], reason: '' },
      { group: 'liquidity' as const, value: null, availability: 0, confidence: 0, featureCount: 3, availableFeatureCount: 0, missingFeatures: ['volume'], reason: '' },
      { group: 'ownership' as const, value: null, availability: 0, confidence: 0, featureCount: 3, availableFeatureCount: 0, missingFeatures: ['promoter_holding'], reason: '' },
      { group: 'events' as const, value: null, availability: 0, confidence: 0, featureCount: 4, availableFeatureCount: 0, missingFeatures: ['dividend_count_12m'], reason: '' },
      { group: 'dataQuality' as const, value: null, availability: 0, confidence: 0, featureCount: 4, availableFeatureCount: 0, missingFeatures: ['feature_freshness'], reason: '' },
    ];
    const r = computeCompositeScore(factorScores);
    expect(r.baseScore).toBeNull();
    expect(r.rankingScore).toBeNull();
    expect(r.riskDampening).toBe(0);
    expect(r.availableWeight).toBe(0);
  });

  it('risk dampening works correctly', () => {
    const base = [
      { group: 'quality' as const, value: 80, availability: 100, confidence: 80, featureCount: 8, availableFeatureCount: 8, missingFeatures: [], reason: '' },
      { group: 'valuation' as const, value: 60, availability: 100, confidence: 80, featureCount: 5, availableFeatureCount: 5, missingFeatures: [], reason: '' },
      { group: 'growth' as const, value: 70, availability: 100, confidence: 80, featureCount: 4, availableFeatureCount: 4, missingFeatures: [], reason: '' },
      { group: 'stability' as const, value: 50, availability: 100, confidence: 80, featureCount: 5, availableFeatureCount: 4, missingFeatures: ['market_cap'], reason: '' },
      { group: 'momentum' as const, value: 60, availability: 100, confidence: 80, featureCount: 6, availableFeatureCount: 6, missingFeatures: [], reason: '' },
      { group: 'risk' as const, value: 20, availability: 100, confidence: 80, featureCount: 4, availableFeatureCount: 4, missingFeatures: [], reason: '' },
      { group: 'sector' as const, value: 50, availability: 100, confidence: 80, featureCount: 3, availableFeatureCount: 3, missingFeatures: [], reason: '' },
      { group: 'liquidity' as const, value: 50, availability: 100, confidence: 80, featureCount: 3, availableFeatureCount: 3, missingFeatures: [], reason: '' },
      { group: 'ownership' as const, value: 50, availability: 100, confidence: 80, featureCount: 3, availableFeatureCount: 3, missingFeatures: [], reason: '' },
      { group: 'events' as const, value: 50, availability: 100, confidence: 80, featureCount: 4, availableFeatureCount: 4, missingFeatures: [], reason: '' },
      { group: 'dataQuality' as const, value: 80, availability: 100, confidence: 80, featureCount: 4, availableFeatureCount: 4, missingFeatures: [], reason: '' },
    ];

    const highRisk = computeCompositeScore(base.map(fs =>
      fs.group === 'risk' ? { ...fs, value: 20 } : fs
    ));
    const lowRisk = computeCompositeScore(base.map(fs =>
      fs.group === 'risk' ? { ...fs, value: 85 } : fs
    ));

    expect(highRisk.rankingScore).toBeDefined();
    expect(lowRisk.rankingScore).toBeDefined();
    expect(highRisk.riskDampening).toBeGreaterThan(lowRisk.riskDampening);
    expect(lowRisk.rankingScore!).toBeGreaterThan(highRisk.rankingScore!);
  });
});

// ── Confidence Scorer ─────────────────────────────────────────────

describe('computeConfidence', () => {
  it('full data returns HIGH', () => {
    const r = computeConfidence(100, 0, 50, 95, 5);
    expect(r.level).toBe('HIGH');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });

  it('stale data returns lower', () => {
    const fresh = computeConfidence(100, 0, 50, 95, 5);
    const stale = computeConfidence(100, 5, 50, 95, 5);
    expect(stale.score).toBeLessThan(fresh.score);
    expect(stale.level).toBe('MEDIUM');
  });

  it('handles boundary levels', () => {
    expect(computeConfidence(100, 0, 50, 95, 5).level).toBe('HIGH');
    expect(computeConfidence(60, 1, 50, 65, 5).level).toBe('MEDIUM');
    expect(computeConfidence(55, 2, 50, 45, 5).level).toBe('LOW');
    expect(computeConfidence(30, 5, 50, 20, 5).level).toBe('CRITICAL');
  });
});

// ── Classification Scorer ─────────────────────────────────────────

describe('classifyScore', () => {
  const thresholds = classificationThresholds();

  it('null returns INSUFFICIENT_DATA', () => {
    expect(classifyScore(null)).toBe('INSUFFICIENT_DATA');
  });

  it('all 6 bands map correctly', () => {
    expect(classifyScore(85)).toBe('EXCELLENT');
    expect(classifyScore(70)).toBe('HEALTHY');
    expect(classifyScore(55)).toBe('STABLE');
    expect(classifyScore(40)).toBe('WEAKENING');
    expect(classifyScore(20)).toBe('AT_RISK');
    expect(classifyScore(null)).toBe('INSUFFICIENT_DATA');
  });

  it('boundary values work', () => {
    expect(classifyScore(80)).toBe('EXCELLENT');
    expect(classifyScore(79)).toBe('HEALTHY');
    expect(classifyScore(65)).toBe('HEALTHY');
    expect(classifyScore(64)).toBe('STABLE');
    expect(classifyScore(50)).toBe('STABLE');
    expect(classifyScore(49)).toBe('WEAKENING');
    expect(classifyScore(35)).toBe('WEAKENING');
    expect(classifyScore(34)).toBe('AT_RISK');
    expect(classifyScore(0)).toBe('AT_RISK');
  });

  it('classificationThresholds returns 6 entries', () => {
    expect(Object.keys(thresholds)).toHaveLength(6);
    expect(thresholds.EXCELLENT).toEqual({ min: 80, max: 100 });
    expect(thresholds.HEALTHY).toEqual({ min: 65, max: 79 });
    expect(thresholds.STABLE).toEqual({ min: 50, max: 64 });
    expect(thresholds.WEAKENING).toEqual({ min: 35, max: 49 });
    expect(thresholds.AT_RISK).toEqual({ min: 0, max: 34 });
  });

  it('classificationLabel returns correct labels', () => {
    expect(classificationLabel('EXCELLENT')).toBe('Excellent');
    expect(classificationLabel('HEALTHY')).toBe('Healthy');
    expect(classificationLabel('STABLE')).toBe('Stable');
    expect(classificationLabel('WEAKENING')).toBe('Weakening');
    expect(classificationLabel('AT_RISK')).toBe('At Risk');
    expect(classificationLabel('INSUFFICIENT_DATA')).toBe('Insufficient Data');
  });
});

// ── Missing Data Policy ───────────────────────────────────────────

describe('evaluateMissingData', () => {
  const sampleDefs: FeatureDefinition[] = [
    {
      id: 'close', label: 'Close Price', family: 'price_return', unit: 'INR',
      sourceTable: 'prices', sourceField: 'close', required: true,
      defaultAvailability: 0.95, nullPolicy: 'reject_group',
      transform: 'identity', directionality: 'neutral',
      factorGroup: 'stability', lineageRequired: true,
      activationStatus: 'active', description: '',
    },
    {
      id: 'roe', label: 'ROE', family: 'fundamental_quality', unit: '%',
      sourceTable: 'fundamentals', sourceField: 'roe', required: true,
      defaultAvailability: 0.85, nullPolicy: 'reduce_confidence',
      transform: 'winsorize', winsorizeMin: -100, winsorizeMax: 100,
      directionality: 'higher_is_better', factorGroup: 'quality',
      lineageRequired: true, activationStatus: 'active', description: '',
    },
    {
      id: 'pe_ratio', label: 'P/E', family: 'valuation', unit: 'ratio',
      sourceTable: 'fundamentals', sourceField: 'peRatio', required: true,
      defaultAvailability: 0.88, nullPolicy: 'reduce_confidence',
      transform: 'inverse', directionality: 'lower_is_better',
      factorGroup: 'valuation', lineageRequired: true,
      activationStatus: 'active', description: '',
    },
    {
      id: 'beta', label: 'Beta', family: 'volatility_risk', unit: 'score',
      sourceTable: 'fundamentals', sourceField: 'beta', required: true,
      defaultAvailability: 0.85, nullPolicy: 'reduce_confidence',
      transform: 'winsorize', winsorizeMin: -5, winsorizeMax: 5,
      directionality: 'lower_is_better', factorGroup: 'risk',
      lineageRequired: true, activationStatus: 'active', description: '',
    },
    {
      id: 'volume', label: 'Volume', family: 'volume_liquidity', unit: 'shares',
      sourceTable: 'prices', sourceField: 'volume', required: true,
      defaultAvailability: 0.95, nullPolicy: 'reject_group',
      transform: 'log10', directionality: 'higher_is_better',
      factorGroup: 'liquidity', lineageRequired: true,
      activationStatus: 'active', description: '',
    },
  ];

  it('identifies required group rejections when critical features missing', () => {
    const features: UnifiedFeatureValue[] = [
      makeFeature('close', 250),
      makeFeature('roe', 15),
      makeFeature('pe_ratio', 15),
      makeFeature('beta', 1.1),
    ];
    const r = evaluateMissingData(features, sampleDefs);
    expect(r.rejectedGroupIds).toContain('liquidity');
    expect(r.confidenceReduction).toBeGreaterThan(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it('no rejection when all required features present', () => {
    const features: UnifiedFeatureValue[] = [
      makeFeature('close', 250),
      makeFeature('roe', 15),
      makeFeature('pe_ratio', 15),
      makeFeature('beta', 1.1),
      makeFeature('volume', 1_000_000),
    ];
    const r = evaluateMissingData(features, sampleDefs);
    expect(r.rejectedGroupIds).toHaveLength(0);
    expect(r.confidenceReduction).toBe(0);
  });

  it('confidence reduction scales with rejected group weight', () => {
    const features: UnifiedFeatureValue[] = [
      makeFeature('close', 250),
      makeFeature('roe', 15),
      makeFeature('pe_ratio', 15),
    ];
    const r = evaluateMissingData(features, sampleDefs);
    expect(r.confidenceReduction).toBeGreaterThan(0);
    expect(r.confidenceReduction).toBeLessThanOrEqual(1);
  });

  it('marks unavailable features', () => {
    const defsWithUnavailable: FeatureDefinition[] = [
      ...sampleDefs,
      {
        id: 'buyback_yield', label: 'Buyback Yield', family: 'dividend_capital_returns',
        unit: '%', sourceTable: 'unavailable', sourceField: 'buyback_yield',
        required: false, defaultAvailability: 0.1, nullPolicy: 'tolerate',
        transform: 'unavailable', directionality: 'higher_is_better',
        factorGroup: 'valuation', lineageRequired: false,
        activationStatus: 'experimental', description: '',
      },
    ];
    const features: UnifiedFeatureValue[] = [
      makeFeature('close', 250),
      makeFeature('roe', 15),
      makeFeature('pe_ratio', 15),
      makeFeature('beta', 1.1),
      makeFeature('volume', 1_000_000),
    ];
    const r = evaluateMissingData(features, defsWithUnavailable);
    expect(r.unavailableFeatures).toContain('buyback_yield');
  });
});
