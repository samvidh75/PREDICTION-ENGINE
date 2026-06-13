import { describe, it, expect } from 'vitest';
import {
  FEATURE_REGISTRY,
  getFeatureById,
  getFeaturesByFamily,
  getActiveFeatures,
  getUnavailableFeatures,
  getRequiredFeatures,
  getFeatureCount,
  getActiveFeatureCount,
  getFeatureFamilies,
  type FeatureDefinition,
  type FeatureFamily,
} from './FeatureRegistry';
import { FeatureVector } from './FeatureVector';
import { applyTransform, identity, inverse, log10, zscore, winsorize, percentileRank, ratio, difference } from './FeatureTransforms';

const VALID_FACTOR_GROUPS = [
  'quality', 'valuation', 'growth', 'stability', 'momentum',
  'risk', 'sector', 'liquidity', 'ownership', 'events', 'dataQuality',
];

const VALID_ACTIVATION_STATUSES = ['active', 'unavailable', 'experimental'] as const;

// ── 1. At least 100 features registered ────────────────────────────

describe('Feature registry size', () => {
  it('has at least 100 feature definitions', () => {
    expect(FEATURE_REGISTRY.length).toBeGreaterThanOrEqual(100);
  });

  it('getFeatureCount() >= 100', () => {
    expect(getFeatureCount()).toBeGreaterThanOrEqual(100);
  });
});

// ── 2. All feature ids are unique ─────────────────────────────────

describe('Feature id uniqueness', () => {
  it('all feature ids are unique', () => {
    const ids = FEATURE_REGISTRY.map((f) => f.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ── 3. All active features have sourceTable and sourceField ───────

describe('Active feature source coverage', () => {
  it('every active feature has a non-empty sourceTable', () => {
    const active = getActiveFeatures();
    for (const f of active) {
      expect(f.sourceTable).toBeDefined();
      expect(f.sourceTable.length).toBeGreaterThan(0);
    }
  });

  it('every active feature has a non-empty sourceField', () => {
    const active = getActiveFeatures();
    for (const f of active) {
      expect(f.sourceField).toBeDefined();
      expect(f.sourceField.length).toBeGreaterThan(0);
    }
  });
});

// ── 4. All features have valid factorGroup ────────────────────────

describe('Factor group validation', () => {
  it('every feature has a valid factorGroup from the 11 valid groups', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(VALID_FACTOR_GROUPS).toContain(f.factorGroup);
    }
  });
});

// ── 5. All features have valid activationStatus ───────────────────

describe('Activation status validation', () => {
  it('every feature has a valid activationStatus', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(VALID_ACTIVATION_STATUSES).toContain(f.activationStatus);
    }
  });
});

// ── 6. getActiveFeatureCount ──────────────────────────────────────

describe('Active feature count', () => {
  it('getActiveFeatureCount() matches count of active features', () => {
    const manual = FEATURE_REGISTRY.filter((f) => f.activationStatus === 'active').length;
    expect(getActiveFeatureCount()).toBe(manual);
    expect(getActiveFeatureCount()).toBeGreaterThan(0);
  });
});

// ── 7. getFeaturesByFamily ────────────────────────────────────────

describe('Features by family', () => {
  it('each family returns at least 5 features', () => {
    const families = getFeatureFamilies();
    for (const family of families) {
      const byFamily = getFeaturesByFamily(family);
      expect(byFamily.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('getFeaturesByFamily returns correct family for every feature', () => {
    for (const f of FEATURE_REGISTRY) {
      const byFamily = getFeaturesByFamily(f.family);
      expect(byFamily.some((bf) => bf.id === f.id)).toBe(true);
    }
  });

  it('getFeaturesByFamily returns empty array for unknown family', () => {
    const result = getFeaturesByFamily('unknown' as FeatureFamily);
    expect(result).toEqual([]);
  });
});

// ── 8. getFeatureById ─────────────────────────────────────────────

describe('Get feature by id', () => {
  it('returns correct feature for known id', () => {
    const f = getFeatureById('close');
    expect(f).toBeDefined();
    expect(f!.id).toBe('close');
    expect(f!.family).toBe('price_return');
  });

  it('returns undefined for unknown id', () => {
    const f = getFeatureById('nonexistent_feature');
    expect(f).toBeUndefined();
  });

  it('every feature id in registry is retrievable by id', () => {
    for (const f of FEATURE_REGISTRY) {
      const retrieved = getFeatureById(f.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.id).toBe(f.id);
      expect(retrieved!.label).toBe(f.label);
    }
  });
});

// ── 9. getRequiredFeatures ────────────────────────────────────────

describe('Required features', () => {
  it('getRequiredFeatures returns only required features', () => {
    const required = getRequiredFeatures();
    for (const f of required) {
      expect(f.required).toBe(true);
    }
  });

  it('all required features are active', () => {
    const required = getRequiredFeatures();
    for (const f of required) {
      expect(f.activationStatus).toBe('active');
    }
  });

  it('at least one feature is required', () => {
    expect(getRequiredFeatures().length).toBeGreaterThan(0);
  });
});

// ── 10. Feature families ──────────────────────────────────────────

describe('Feature families', () => {
  it('returns all 20 families', () => {
    const families = getFeatureFamilies();
    expect(families.length).toBe(20);
  });

  it('every feature family is in the returned list', () => {
    const families = new Set(getFeatureFamilies());
    for (const f of FEATURE_REGISTRY) {
      expect(families.has(f.family)).toBe(true);
    }
  });
});

// ── 11. Unavailable features ──────────────────────────────────────

describe('Unavailable features', () => {
  it('getUnavailableFeatures returns unavailable and experimental features', () => {
    const unavailable = getUnavailableFeatures();
    for (const f of unavailable) {
      expect(['unavailable', 'experimental']).toContain(f.activationStatus);
    }
  });

  it('unavailable features have defaultAvailability of 0', () => {
    const unavailable = FEATURE_REGISTRY.filter((f) => f.activationStatus === 'unavailable');
    for (const f of unavailable) {
      expect(f.defaultAvailability).toBe(0);
    }
  });

  it('peer_percentile family features are all unavailable', () => {
    const peerFeatures = getFeaturesByFamily('peer_percentile');
    for (const f of peerFeatures) {
      expect(f.activationStatus).toBe('unavailable');
    }
  });

  it('corporate_actions family features are all unavailable', () => {
    const corpFeatures = getFeaturesByFamily('corporate_actions');
    for (const f of corpFeatures) {
      expect(f.activationStatus).toBe('unavailable');
    }
  });

  it('news_events family features are all unavailable', () => {
    const newsFeatures = getFeaturesByFamily('news_events');
    for (const f of newsFeatures) {
      expect(f.activationStatus).toBe('unavailable');
    }
  });
});

// ── 12. Feature families activation status patterns ───────────────

describe('Family activation patterns', () => {
  it('price_return features are all active', () => {
    const features = getFeaturesByFamily('price_return');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('volume_liquidity features are all active', () => {
    const features = getFeaturesByFamily('volume_liquidity');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('trend_momentum features are all active', () => {
    const features = getFeaturesByFamily('trend_momentum');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('volatility_risk features are all active', () => {
    const features = getFeaturesByFamily('volatility_risk');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('fundamental_quality features are all active', () => {
    const features = getFeaturesByFamily('fundamental_quality');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('valuation features are all active', () => {
    const features = getFeaturesByFamily('valuation');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('growth features are all active', () => {
    const features = getFeaturesByFamily('growth');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('balance_sheet features are all active', () => {
    const features = getFeaturesByFamily('balance_sheet');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('cash_flow features are all active', () => {
    const features = getFeaturesByFamily('cash_flow');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('profitability_margins features are all active', () => {
    const features = getFeaturesByFamily('profitability_margins');
    for (const f of features) expect(f.activationStatus).toBe('active');
  });

  it('score_stability features are all experimental', () => {
    const features = getFeaturesByFamily('score_stability');
    for (const f of features) expect(f.activationStatus).toBe('experimental');
  });

  it('benchmark_market_regime features are all experimental', () => {
    const features = getFeaturesByFamily('benchmark_market_regime');
    for (const f of features) expect(f.activationStatus).toBe('experimental');
  });
});

// ── 13. FeatureVector ─────────────────────────────────────────────

describe('FeatureVector', () => {
  it('reports correct missing features', () => {
    const values = [
      { id: 'a', label: 'A', raw: 1.0, transformed: 1.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'b', label: 'B', raw: null, transformed: null, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'c', label: 'C', raw: 3.0, transformed: 3.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
    ];
    const fv = new FeatureVector(values);
    expect(fv.getMissing()).toEqual(['b']);
    expect(fv.has('a')).toBe(true);
    expect(fv.has('b')).toBe(true);
    expect(fv.has('d')).toBe(false);
  });

  it('getActive returns non-null features', () => {
    const values = [
      { id: 'a', label: 'A', raw: 1.0, transformed: 1.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'b', label: 'B', raw: null, transformed: null, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
    ];
    const fv = new FeatureVector(values);
    const active = fv.getActive();
    expect(active.length).toBe(1);
    expect(active[0].id).toBe('a');
  });

  it('getCompleteness returns correct percentage', () => {
    const values = [
      { id: 'a', label: 'A', raw: 1.0, transformed: 1.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'b', label: 'B', raw: null, transformed: null, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'c', label: 'C', raw: 3.0, transformed: 3.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
    ];
    const fv = new FeatureVector(values);
    expect(fv.getCompleteness()).toBe(67);
  });

  it('getCompleteness returns 0 for empty vector', () => {
    const fv = new FeatureVector([]);
    expect(fv.getCompleteness()).toBe(0);
  });

  it('getStaleCount returns correct count', () => {
    const values = [
      { id: 'a', label: 'A', raw: 1.0, transformed: 1.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: true },
      { id: 'b', label: 'B', raw: null, transformed: null, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
      { id: 'c', label: 'C', raw: 3.0, transformed: 3.0, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: true },
    ];
    const fv = new FeatureVector(values);
    expect(fv.getStaleCount()).toBe(2);
  });

  it('getRaw and getTransformed return correct values', () => {
    const values = [
      { id: 'x', label: 'X', raw: 42.5, transformed: 42.5, unit: '', sourceTable: 't', sourceField: 'f', freshness: null, confidence: null, isStale: false },
    ];
    const fv = new FeatureVector(values);
    expect(fv.getRaw('x')).toBe(42.5);
    expect(fv.getTransformed('x')).toBe(42.5);
    expect(fv.getRaw('nonexistent')).toBeNull();
    expect(fv.getTransformed('nonexistent')).toBeNull();
  });

  it('toJSON returns flat record with correct shape', () => {
    const values = [
      { id: 'a', label: 'A', raw: 1.0, transformed: 2.0, unit: '%', sourceTable: 't', sourceField: 'f', freshness: 1, confidence: 90, isStale: false },
    ];
    const fv = new FeatureVector(values);
    const json = fv.toJSON();
    expect(json.a).toBeDefined();
    expect((json.a as Record<string, unknown>).raw).toBe(1.0);
    expect((json.a as Record<string, unknown>).transformed).toBe(2.0);
  });

  it('get returns undefined for missing id', () => {
    const fv = new FeatureVector([]);
    expect(fv.get('nothing')).toBeUndefined();
  });
});

// ── 14. FeatureTransforms ─────────────────────────────────────────

describe('identity', () => {
  it('returns the same value for finite numbers', () => {
    expect(identity(42)).toBe(42);
    expect(identity(-3.14)).toBe(-3.14);
    expect(identity(0)).toBe(0);
  });

  it('returns null for NaN', () => {
    expect(identity(NaN)).toBeNull();
  });

  it('returns null for Infinity', () => {
    expect(identity(Infinity)).toBeNull();
    expect(identity(-Infinity)).toBeNull();
  });
});

describe('inverse', () => {
  it('returns 1/value for finite non-zero', () => {
    expect(inverse(2)).toBe(0.5);
    expect(inverse(10)).toBe(0.1);
  });

  it('returns null for zero', () => {
    expect(inverse(0)).toBeNull();
  });

  it('returns null for NaN/Infinity', () => {
    expect(inverse(NaN)).toBeNull();
    expect(inverse(Infinity)).toBeNull();
  });
});

describe('log10', () => {
  it('returns log10 of positive numbers', () => {
    expect(log10(100)).toBe(2);
    expect(log10(1)).toBe(0);
    expect(log10(0.001)).toBe(-3);
  });

  it('returns null for zero', () => {
    expect(log10(0)).toBeNull();
  });

  it('returns null for negative numbers', () => {
    expect(log10(-1)).toBeNull();
  });

  it('returns null for NaN/Infinity', () => {
    expect(log10(NaN)).toBeNull();
    expect(log10(Infinity)).toBeNull();
  });
});

describe('zscore', () => {
  it('returns correct z-score', () => {
    expect(zscore(10, 5, 2)).toBe(2.5);
    expect(zscore(5, 5, 2)).toBe(0);
  });

  it('returns null for std=0', () => {
    expect(zscore(5, 5, 0)).toBeNull();
  });

  it('returns null for NaN/Infinity inputs', () => {
    expect(zscore(NaN, 5, 2)).toBeNull();
    expect(zscore(5, NaN, 2)).toBeNull();
    expect(zscore(5, 5, NaN)).toBeNull();
  });
});

describe('winsorize', () => {
  it('clamps values below min', () => {
    expect(winsorize(-5, 0, 100)).toBe(0);
  });

  it('clamps values above max', () => {
    expect(winsorize(150, 0, 100)).toBe(100);
  });

  it('passes through values in range', () => {
    expect(winsorize(50, 0, 100)).toBe(50);
  });

  it('returns null for NaN/Infinity', () => {
    expect(winsorize(NaN, 0, 100)).toBeNull();
    expect(winsorize(Infinity, 0, 100)).toBeNull();
  });

  it('returns null when min > max', () => {
    expect(winsorize(50, 100, 0)).toBeNull();
  });
});

describe('percentileRank', () => {
  it('returns 100 for value at or above max', () => {
    expect(percentileRank(10, [1, 2, 3, 4, 5])).toBe(100);
  });

  it('returns 0 for value below min', () => {
    expect(percentileRank(0, [1, 2, 3, 4, 5])).toBe(0);
  });

  it('returns correct percentile', () => {
    expect(percentileRank(3, [1, 2, 3, 4, 5])).toBe(60);
  });

  it('returns null for empty array', () => {
    expect(percentileRank(5, [])).toBeNull();
  });

  it('returns null for NaN value', () => {
    expect(percentileRank(NaN, [1, 2, 3])).toBeNull();
  });

  it('filters out NaN in array', () => {
    expect(percentileRank(3, [1, NaN, 3, 4, 5])).toBe(50);
  });
});

describe('ratio', () => {
  it('returns correct ratio', () => {
    expect(ratio(10, 2)).toBe(5);
    expect(ratio(0, 5)).toBe(0);
  });

  it('returns null for division by zero', () => {
    expect(ratio(5, 0)).toBeNull();
  });

  it('returns null for NaN/Infinity inputs', () => {
    expect(ratio(NaN, 2)).toBeNull();
    expect(ratio(5, NaN)).toBeNull();
    expect(ratio(Infinity, 2)).toBeNull();
  });
});

describe('difference', () => {
  it('returns a - b', () => {
    expect(difference(10, 3)).toBe(7);
    expect(difference(-5, -10)).toBe(5);
  });

  it('returns null for NaN/Infinity', () => {
    expect(difference(NaN, 5)).toBeNull();
    expect(difference(5, NaN)).toBeNull();
    expect(difference(Infinity, 5)).toBeNull();
  });
});

describe('applyTransform', () => {
  it('returns null for null input', () => {
    const def = FEATURE_REGISTRY[0];
    expect(applyTransform(null, def)).toBeNull();
  });

  it('returns null for NaN input', () => {
    const def = FEATURE_REGISTRY.find((f) => f.transform === 'identity')!;
    expect(applyTransform(NaN, def)).toBeNull();
  });

  it('applies identity transform', () => {
    const def = FEATURE_REGISTRY.find((f) => f.id === 'rsi')!;
    expect(def.transform).toBe('identity');
    expect(applyTransform(55, def)).toBe(55);
  });

  it('applies inverse transform on pe_ratio', () => {
    const def = FEATURE_REGISTRY.find((f) => f.id === 'pe_ratio')!;
    expect(def.transform).toBe('inverse');
    expect(applyTransform(15, def)).toBeCloseTo(0.0667, 3);
  });

  it('applies log10 transform on volume', () => {
    const def = FEATURE_REGISTRY.find((f) => f.id === 'volume')!;
    expect(def.transform).toBe('log10');
    expect(applyTransform(1_000_000, def)).toBe(6);
  });

  it('applies winsorize transform on roe', () => {
    const def = FEATURE_REGISTRY.find((f) => f.id === 'roe')!;
    expect(def.transform).toBe('winsorize');
    expect(applyTransform(0.50, def)).toBe(0.50);
    expect(applyTransform(0.10, def)).toBe(0.10);
  });

  it('applies binary transform on has_corporate_action_90d', () => {
    const def = FEATURE_REGISTRY.find((f) => f.id === 'has_corporate_action_90d')!;
    expect(def.transform).toBe('binary');
    expect(applyTransform(0, def)).toBe(0);
    expect(applyTransform(1, def)).toBe(1);
    expect(applyTransform(5, def)).toBe(1);
  });
});

// ── 15. Metadata completeness ─────────────────────────────────────

describe('Feature metadata completeness', () => {
  it('every feature has a non-empty label', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(f.label.length).toBeGreaterThan(0);
    }
  });

  it('every feature has a non-empty description', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(f.description.length).toBeGreaterThan(0);
    }
  });

  it('every feature has a valid nullPolicy', () => {
    const validPolicies = ['reject_group', 'reduce_confidence', 'tolerate'];
    for (const f of FEATURE_REGISTRY) {
      expect(validPolicies).toContain(f.nullPolicy);
    }
  });

  it('every feature has a valid transform', () => {
    const validTransforms = [
      'identity', 'inverse', 'log10', 'zscore', 'winsorize',
      'percentile', 'binary', 'ratio', 'difference', 'custom', 'unavailable',
    ];
    for (const f of FEATURE_REGISTRY) {
      expect(validTransforms).toContain(f.transform);
    }
  });

  it('every feature has defaultAvailability between 0 and 1', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(f.defaultAvailability).toBeGreaterThanOrEqual(0);
      expect(f.defaultAvailability).toBeLessThanOrEqual(1);
    }
  });

  it('every feature has directionality set', () => {
    const valid = ['higher_is_better', 'lower_is_better', 'neutral'];
    for (const f of FEATURE_REGISTRY) {
      expect(valid).toContain(f.directionality);
    }
  });

  it('every feature has a non-empty unit', () => {
    for (const f of FEATURE_REGISTRY) {
      expect(f.unit.length).toBeGreaterThan(0);
    }
  });
});

// ── 16. Active features have non-zero defaultAvailability ────────

describe('Active feature availability', () => {
  it('all active features have defaultAvailability > 0.5', () => {
    const active = getActiveFeatures();
    for (const f of active) {
      expect(f.defaultAvailability).toBeGreaterThan(0.5);
    }
  });

  it('all unavailable features have defaultAvailability = 0', () => {
    const unavailable = FEATURE_REGISTRY.filter((f) => f.activationStatus === 'unavailable');
    for (const f of unavailable) {
      expect(f.defaultAvailability).toBe(0);
    }
  });

  it('all experimental features have defaultAvailability < 0.5', () => {
    const experimental = FEATURE_REGISTRY.filter((f) => f.activationStatus === 'experimental');
    for (const f of experimental) {
      expect(f.defaultAvailability).toBeLessThan(0.5);
    }
  });
});
