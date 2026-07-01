import { describe, it, expect } from 'vitest';
import { ResearchNarrativeService } from '../ResearchNarrativeService';
import type { LensoryResearchInput } from '../types';

const service = new ResearchNarrativeService();

function makeInput(overrides: Partial<LensoryResearchInput> = {}): LensoryResearchInput {
  return {
    symbol: 'TEST',
    companyName: 'Test Company Ltd',
    sector: 'Technology',
    score: 68,
    conviction: 60,
    factorScores: { quality: 65, valuation: 55, growth: 60, stability: 70, risk: 40, momentum: 58 },
    factorBreakdowns: {
      quality: { roeScore: 70, roaScore: 65, roicScore: 68, grossMarginScore: 72, operatingMarginScore: 60, efficiencyScore: 65, compositeScore: 67 },
      valuation: { peScore: 60, pbScore: 55, evEbitdaScore: 50, fcfYieldScore: 65, dividendYieldScore: 50, compositeScore: 56 },
      growth: { revenueGrowthScore: 65, epsGrowthScore: 60, fcfGrowthScore: 55, profitGrowthScore: 58, compositeScore: 60 },
      momentum: { rsiScore: 60, macdScore: 55, adxScore: 50, trendStrengthScore: 55, compositeScore: 55 },
    },
    topPositiveDrivers: ['Strong revenue growth', 'Healthy profit margins'],
    topNegativeDrivers: ['Elevated valuation multiples'],
    riskFlags: [],
    valuationContext: { peScore: 60, pbScore: 55, evEbitdaScore: 50, fcfYieldScore: 65, dividendYieldScore: 50, compositeScore: 56 },
    growthContext: { revenueGrowthScore: 65, epsGrowthScore: 60, fcfGrowthScore: 55, profitGrowthScore: 58, compositeScore: 60 },
    qualityContext: { roeScore: 70, roaScore: 65, roicScore: 68, grossMarginScore: 72, operatingMarginScore: 60, efficiencyScore: 65, compositeScore: 67 },
    momentumContext: { rsiScore: 60, macdScore: 55, adxScore: 50, trendStrengthScore: 55, compositeScore: 55 },
    whatChangedInputs: [],
    dataCompletenessForInternalUseOnly: 85,
    ...overrides,
  };
}

describe('ResearchNarrativeService', () => {
  describe('generateCompanyThesis', () => {
    it('generates thesis for healthy company', () => {
      const result = service.generateCompanyThesis(makeInput());
      expect(result).toContain('Test Company Ltd');
      expect(result).toContain('Technology');
    });

    it('generates thesis for excellent company', () => {
      const result = service.generateCompanyThesis(makeInput({ score: 85, factorScores: { quality: 80, valuation: 60, growth: 75, stability: 80, risk: 20, momentum: 70 } }));
      expect(result).toContain('compelling research profile');
    });

    it('generates thesis for at-risk company', () => {
      const result = service.generateCompanyThesis(makeInput({ score: 25, factorScores: { quality: 25, valuation: 30, growth: 20, stability: 30, risk: 80, momentum: 20 } }));
      expect(result).toContain('research candidate than an immediate action');
    });

    it('returns a string', () => {
      const result = service.generateCompanyThesis(makeInput());
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('does not contain forbidden words', () => {
      const result = service.generateCompanyThesis(makeInput());
      expect(result.toLowerCase()).not.toContain('buy');
      expect(result.toLowerCase()).not.toContain('sell');
      expect(result.toLowerCase()).not.toContain('target');
      expect(result.toLowerCase()).not.toContain('guaranteed');
      expect(result.toLowerCase()).not.toContain('multibagger');
    });
  });

  describe('generateBullCase', () => {
    it('generates bull case for quality company', () => {
      const result = service.generateBullCase(makeInput({
        factorScores: { quality: 75, valuation: 50, growth: 65, stability: 70, risk: 30, momentum: 60 },
        qualityContext: { roeScore: 85, roaScore: 80, roicScore: 82, grossMarginScore: 85, operatingMarginScore: 78, efficiencyScore: 80, compositeScore: 82 },
      }));
      expect(result).toContain('returns on capital');
    });
  });

  describe('generateBearCase', () => {
    it('generates bear case for risky company', () => {
      const result = service.generateBearCase(makeInput({
        factorScores: { quality: 40, valuation: 30, growth: 35, stability: 35, risk: 75, momentum: 25 },
        riskFlags: [{ type: 'Leverage', severity: 'high', description: 'Elevated debt levels' }],
      }));
      expect(result).toContain('Risk indicators are elevated');
    });

    it('returns fallback when no bear case', () => {
      const result = service.generateBearCase(makeInput({
        factorScores: { quality: 70, valuation: 60, growth: 65, stability: 75, risk: 30, momentum: 65 },
      }));
      expect(result).toContain('not immediately pronounced');
    });
  });

  describe('generateWhatChanged', () => {
    it('returns no changes when none provided', () => {
      const result = service.generateWhatChanged(makeInput({ whatChangedInputs: [] }));
      expect(result).toContain('No significant changes detected');
    });

    it('includes provided changes', () => {
      const result = service.generateWhatChanged(makeInput({
        whatChangedInputs: ['Revenue growth accelerated to 15%', 'Margins expanded 200 bps'],
      }));
      expect(result).toContain('Revenue growth accelerated');
    });
  });

  describe('generateWhyItMatters', () => {
    it('generates context for quality company', () => {
      const result = service.generateWhyItMatters(makeInput({
        factorScores: { quality: 75, valuation: 50, growth: 65, stability: 70, risk: 30, momentum: 60 },
      }));
      expect(result).toContain('Test Company Ltd');
      expect(result).toContain('Technology');
    });
  });

  describe('generateComplianceSafeLabel', () => {
    it('returns correct label for excellent', () => {
      expect(service.generateComplianceSafeLabel(makeInput({ score: 85 }))).toBe('Research — Strong Profile');
    });
    it('returns correct label for healthy', () => {
      expect(service.generateComplianceSafeLabel(makeInput({ score: 68 }))).toBe('Research — Healthy Profile');
    });
    it('returns correct label for stable', () => {
      expect(service.generateComplianceSafeLabel(makeInput({ score: 52 }))).toBe('Research — Stable Profile');
    });
    it('returns correct label for weakening', () => {
      expect(service.generateComplianceSafeLabel(makeInput({ score: 38 }))).toBe('Research — Needs Review');
    });
    it('returns correct label for at-risk', () => {
      expect(service.generateComplianceSafeLabel(makeInput({ score: 20 }))).toBe('Research — Elevated Risk');
    });
  });

  describe('generateFullNarrative', () => {
    it('produces complete output contract', () => {
      const result = service.generateFullNarrative(makeInput());
      expect(result).toHaveProperty('thesis');
      expect(result).toHaveProperty('bullCase');
      expect(result).toHaveProperty('bearCase');
      expect(result).toHaveProperty('whatChanged');
      expect(result).toHaveProperty('whyItMatters');
      expect(result).toHaveProperty('keyRisks');
      expect(result).toHaveProperty('watchNext');
      expect(result).toHaveProperty('peerContextSummary');
      expect(result).toHaveProperty('confidenceNote');
      expect(result).toHaveProperty('methodologyNote');
      expect(result).toHaveProperty('complianceSafeLabel');
    });

    it('all fields are strings with content', () => {
      const result = service.generateFullNarrative(makeInput());
      for (const [key, value] of Object.entries(result)) {
        expect(typeof value, `Field ${key} should be a string`).toBe('string');
        expect(value.length, `Field ${key} should not be empty`).toBeGreaterThan(0);
      }
    });
  });

  describe('template edge cases', () => {
    it('handles high quality + expensive valuation', () => {
      const input = makeInput({
        score: 65,
        factorScores: { quality: 80, valuation: 25, growth: 50, stability: 70, risk: 35, momentum: 55 },
        valuationContext: { peScore: 20, pbScore: 25, evEbitdaScore: 30, fcfYieldScore: 25, dividendYieldScore: 30, compositeScore: 26 },
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.thesis).toBeTruthy();
      expect(narrative.bullCase).toBeTruthy();
    });

    it('handles low debt + weak growth', () => {
      const input = makeInput({
        score: 55,
        factorScores: { quality: 55, valuation: 50, growth: 30, stability: 75, risk: 35, momentum: 45 },
        growthContext: { revenueGrowthScore: 25, epsGrowthScore: 30, fcfGrowthScore: 35, profitGrowthScore: 28, compositeScore: 30 },
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.thesis).toBeTruthy();
    });

    it('handles strong momentum + high risk', () => {
      const input = makeInput({
        score: 50,
        factorScores: { quality: 50, valuation: 45, growth: 45, stability: 40, risk: 70, momentum: 75 },
        riskFlags: [{ type: 'Volatility', severity: 'high', description: 'Extreme price volatility' }],
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.bearCase).toContain('Risk indicators');
    });

    it('handles missing technicals', () => {
      const input = makeInput({
        momentumContext: { rsiScore: 50, macdScore: 50, adxScore: 50, trendStrengthScore: 50, compositeScore: 50 },
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.thesis).toBeTruthy();
    });

    it('handles missing valuation', () => {
      const input = makeInput({
        factorScores: { quality: 50, valuation: 50, growth: 50, stability: 50, risk: 50, momentum: 50 },
        valuationContext: { peScore: 50, pbScore: 50, evEbitdaScore: 50, fcfYieldScore: 50, dividendYieldScore: 50, compositeScore: 50 },
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.thesis).toBeTruthy();
    });

    it('handles high dividend trap', () => {
      const input = makeInput({
        score: 45,
        factorScores: { quality: 40, valuation: 55, growth: 30, stability: 35, risk: 65, momentum: 35 },
        riskFlags: [{ type: 'Dividend sustainability', severity: 'high', description: 'Dividend yield may be unsustainable given cash flow trends' }],
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.keyRisks).toBeTruthy();
    });

    it('handles null-heavy input', () => {
      const input = makeInput({
        dataCompletenessForInternalUseOnly: 15,
        factorScores: { quality: 50, valuation: 50, growth: 50, stability: 50, risk: 50, momentum: 50 },
      });
      const narrative = service.generateFullNarrative(input);
      expect(narrative.confidenceNote).toContain('limited');
    });

    it('no forbidden copy', () => {
      const input = makeInput();
      const narrative = service.generateFullNarrative(input);
      const full = Object.values(narrative).join(' ').toLowerCase();
      expect(full).not.toContain('buy now');
      expect(full).not.toContain('strong buy');
      expect(full).not.toContain('sell');
      expect(full).not.toContain('price target');
      expect(full).not.toContain('guaranteed');
      expect(full).not.toContain('multibagger');
      expect(full).not.toContain('provider status');
    });

    it('no hallucinated facts', () => {
      const input = makeInput();
      const narrative = service.generateFullNarrative(input);
      const full = Object.values(narrative).join(' ');
      expect(full).not.toContain('₹');
      expect(full).not.toContain('crore');
      expect(full).not.toContain('lakh');
    });
  });
});
