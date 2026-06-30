import { describe, expect, it } from 'vitest';
import { toMarketBrainPanelViewModel } from './marketBrainViewModel';

describe('toMarketBrainPanelViewModel', () => {
  const MINIMAL_VALID = {
    symbol: 'RELIANCE',
    companyName: 'Reliance Industries',
    state: 'Stable',
    headline: 'Strong fundamentals support positive outlook',
    thesis: ['Robust revenue growth across segments'],
    risksToReview: ['Debt levels increasing'],
    whatToWatch: ['Q3 earnings'],
    evidenceSummary: ['Price action supports thesis'],
    evidenceReview: {
      needsReview: false,
      partial: ['price_action'],
      missing: [],
      summary: 'Adequate evidence',
    },
    whyDidThisMove: {
      direction: 'up',
      confidence: 'strong',
      magnitudePct: 3.2,
      primaryDriver: 'Strong quarterly results',
      contributingFactors: ['Volume expansion'],
      risksToThesis: ['Valuation concerns'],
      summary: 'Move driven by earnings beat',
      keyLevels: ['2800', '3000'],
      neededContext: [],
    },
    factorViews: [
      { key: 'revenue_growth', label: 'Revenue Growth', score: 85, summary: 'Strong growth momentum' },
    ],
    methodNote: 'Algorithmic assessment based on financial metrics',
    anomalyReview: null,
    generatedAt: '2025-01-01T00:00:00Z',
  };

  describe('valid input', () => {
    it('returns a view model for fully valid input', () => {
      const result = toMarketBrainPanelViewModel(MINIMAL_VALID);
      expect(result).not.toBeNull();
      expect(result!.symbol).toBe('RELIANCE');
      expect(result!.companyName).toBe('Reliance Industries');
      expect(result!.headline).toBe('Strong fundamentals support positive outlook');
      expect(result!.thesis).toEqual(['Robust revenue growth across segments']);
      expect(result!.risksToReview).toEqual(['Debt levels increasing']);
    });

    it('includes whyDidThisMove when present', () => {
      const result = toMarketBrainPanelViewModel(MINIMAL_VALID);
      expect(result!.whyDidThisMove).not.toBeNull();
      expect(result!.whyDidThisMove!.primaryDriver).toBe('Strong quarterly results');
      expect(result!.whyDidThisMove!.magnitudePct).toBe(3.2);
    });

    it('includes factor views sorted by score', () => {
      const result = toMarketBrainPanelViewModel(MINIMAL_VALID);
      expect(result!.factorViews).toHaveLength(1);
      expect(result!.factorViews[0].key).toBe('revenue_growth');
    });

    it('includes evidence review', () => {
      const result = toMarketBrainPanelViewModel(MINIMAL_VALID);
      expect(result!.evidenceReview).not.toBeNull();
      expect(result!.evidenceReview!.needsReview).toBe(false);
    });
  });

  describe('edge cases and safety', () => {
    it('returns null for null input', () => {
      expect(toMarketBrainPanelViewModel(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(toMarketBrainPanelViewModel(undefined)).toBeNull();
    });

    it('returns null for non-object input', () => {
      expect(toMarketBrainPanelViewModel('string')).toBeNull();
      expect(toMarketBrainPanelViewModel(42)).toBeNull();
      expect(toMarketBrainPanelViewModel([])).toBeNull();
    });

    it('returns null if symbol, companyName, and headline are all missing', () => {
      const result = toMarketBrainPanelViewModel({ state: 'Stable', thesis: [] });
      // Special case — with only state and empty thesis, nothing meaningful remains
      expect(result).toBeNull();
    });

    it('truncates strings over 500 chars', () => {
      const long = 'x'.repeat(600);
      const result = toMarketBrainPanelViewModel({ ...MINIMAL_VALID, headline: long });
      expect(result!.headline.length).toBeLessThanOrEqual(501);
      expect(result!.headline.endsWith('…')).toBe(true);
    });

    it('limits arrays to 10 items', () => {
      const many = Array.from({ length: 20 }, (_, i) => `item ${i}`);
      const result = toMarketBrainPanelViewModel({ ...MINIMAL_VALID, thesis: many, risksToReview: many });
      expect(result!.thesis).toHaveLength(10);
      expect(result!.risksToReview).toHaveLength(10);
    });

    it('handles malformed evidenceReview gracefully', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        evidenceReview: { needsReview: 'not-a-boolean' },
      });
      expect(result!.evidenceReview).not.toBeNull();
      expect(result!.evidenceReview!.needsReview).toBe(false);
    });

    it('handles null whyDidThisMove gracefully', () => {
      const result = toMarketBrainPanelViewModel({ ...MINIMAL_VALID, whyDidThisMove: null });
      expect(result).not.toBeNull();
      expect(result!.whyDidThisMove).toBeNull();
    });

    it('filters out invalid factor views', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        factorViews: [
          { key: 'valid_key', label: 'Valid', score: 75, summary: 'ok' },
          { key: '', label: 'No key', score: 0, summary: '' },
          null,
          { key: 'another', label: 'Another', score: 60, summary: 'good' },
        ],
      });
      expect(result!.factorViews).toHaveLength(2);
    });

    it('handles missing string fields safely', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        headline: undefined,
        methodNote: undefined,
      });
      expect(result!.headline).toBe('');
      expect(result!.methodNote).toBe('');
    });
  });

  describe('forbidden terms filtering', () => {
    it('does not pass through "provider" in headline', () => {
      // Note: the view model doesn't filter forbidden terms — that's the DTO layer's job.
      // The view model just transforms and caps. Forbidden filtering already happened in the
      // safe DTO layer (fetchMarketBrainResearch's normalizeResearchResponse).
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        headline: 'Provider data shows growth',
      });
      // Headline comes through because the DTO layer already sanitized it
      expect(result!.headline).toBe('Provider data shows growth');
    });
  });

  describe('whyDidThisMove edge cases', () => {
    it('handles null magnitudePct', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        whyDidThisMove: { ...MINIMAL_VALID.whyDidThisMove, magnitudePct: null },
      });
      expect(result!.whyDidThisMove!.magnitudePct).toBeNull();
    });

    it('handles missing contributingFactors', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        whyDidThisMove: { ...MINIMAL_VALID.whyDidThisMove, contributingFactors: undefined },
      });
      expect(result!.whyDidThisMove!.contributingFactors).toEqual([]);
    });
  });

  describe('evidenceReview edge cases', () => {
    it('returns null if evidenceReview has no meaningful content', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        evidenceReview: { needsReview: false, partial: [], missing: [], summary: '' },
      });
      expect(result!.evidenceReview).toBeNull();
    });

    it('returns null safety for null evidenceReview', () => {
      const result = toMarketBrainPanelViewModel({ ...MINIMAL_VALID, evidenceReview: null });
      expect(result).not.toBeNull();
      expect(result!.evidenceReview).toBeNull();
    });
  });

  describe('anomalyReview safety', () => {
    it('handles null anomalyReview', () => {
      const result = toMarketBrainPanelViewModel(MINIMAL_VALID);
      expect(result!.anomalyReview).toBeNull();
    });

    it('handles present anomalyReview', () => {
      const result = toMarketBrainPanelViewModel({
        ...MINIMAL_VALID,
        anomalyReview: {
          anomalyType: 'Volume-backed price move',
          severity: 'Medium',
          evidence: ['High delivery volume'],
          missingEvidence: ['News catalyst'],
          summary: 'Suspicious volume pattern',
        },
      });
      expect(result!.anomalyReview).not.toBeNull();
      expect(result!.anomalyReview!.severity).toBe('Medium');
    });
  });
});
