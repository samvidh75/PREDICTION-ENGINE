import { describe, expect, it } from 'vitest';
import { computeFactorScores, countActiveFactors } from '../factorScoring';
import { computeDimensionScores } from '../dimensionScoring';
import { computeResearchScore } from '../researchScore';
import { mapCompanyDataToResearch } from '../inputMapping';

describe('factorScoring', () => {
  it('computes scores from real PE/PB/ROE/debt/growth inputs', () => {
    const scores = computeFactorScores({
      pe: 15.5, pb: 2.1, ev_ebitda: 12.3, dividend_yield: 0.025,
      roe: 0.18, roic: 0.14, operating_margin: 0.22,
      revenue_growth: 0.12, profit_growth: 0.08, eps_growth: 0.1,
      debt_equity: 0.45, current_ratio: 1.8, market_cap: 500000000000,
    });
    expect(scores.pe_ratio).toBe(60);
    expect(scores.pb_ratio).toBe(55);
    expect(scores.ev_ebitda).toBe(45);
    expect(scores.dividend_yield).toBe(65);
    expect(scores.roe).toBe(75);
    expect(scores.roic).toBe(60);
    expect(scores.operating_margin).toBe(75);
    expect(scores.revenue_growth).toBe(60);
    expect(scores.profit_growth).toBe(45);
    expect(scores.eps_growth).toBe(60);
    expect(scores.debt_equity).toBe(60);
    expect(scores.current_ratio).toBe(85);

    const activeCount = countActiveFactors(scores);
    expect(activeCount).toBe(13);
  });

  it('missing factors return null and do not affect score', () => {
    const scores = computeFactorScores({ pe: 15.5 });
    expect(scores.pe_ratio).toBe(60);
    expect(scores.pb_ratio).toBeNull();
    expect(scores.roe).toBeNull();
    expect(countActiveFactors(scores)).toBe(1);
  });

  it('planned factors never affect score (they are not in computeFactorScores)', () => {
    const scores = computeFactorScores({ pe: 15.5, ps: 1.5 });
    expect(scores.pe_ratio).toBe(60);
    expect(Object.keys(scores).length).toBeLessThanOrEqual(13);
  });

  it('valid zero values are preserved', () => {
    const scores = computeFactorScores({ revenue_growth: 0, profit_growth: -0.05 });
    expect(scores.revenue_growth).toBe(30);
    expect(scores.profit_growth).toBe(10);
  });

  it('invalid numeric values normalize to null', () => {
    const scores = computeFactorScores({ pe: NaN, roe: Infinity, debt_equity: undefined });
    expect(scores.pe_ratio).toBeNull();
    expect(scores.roe).toBeNull();
    expect(scores.debt_equity).toBeNull();
  });
});

describe('dimensionScoring', () => {
  it('computes partial dimensions from available factors', () => {
    const factorScores = {
      pe_ratio: 60, pb_ratio: 55, ev_ebitda: 60, dividend_yield: 65,
      roe: 75, roic: 60, operating_margin: 75,
      revenue_growth: 60, profit_growth: 45, eps_growth: 60,
      debt_equity: 60, current_ratio: 85, market_cap: 85,
    };
    const result = computeDimensionScores(factorScores);
    expect(result.activeDimensionCount).toBe(6);
    expect(result.totalDimensionCount).toBe(7);

    const quality = result.dimensions.find(d => d.id === 'quality');
    expect(quality?.score).toBe(70);

    const valuation = result.dimensions.find(d => d.id === 'valuation');
    expect(valuation?.score).toBe(60);

    const momentum = result.dimensions.find(d => d.id === 'momentum');
    expect(momentum?.score).toBeNull();
  });
});

describe('researchScore', () => {
  it('computes overall score only when enough active factors exist', () => {
    const result = computeResearchScore({
      pe: 15.5, pb: 2.1, ev_ebitda: 12.3, dividend_yield: 0.025,
      roe: 0.18, roic: 0.14, operating_margin: 0.22,
      revenue_growth: 0.12, profit_growth: 0.08, eps_growth: 0.1,
      debt_equity: 0.45, current_ratio: 1.8, market_cap: 500000000000,
    });
    expect(result.overallScore).not.toBeNull();
    expect(result.activeFactorCount).toBeGreaterThanOrEqual(3);
    expect(result.confidence).toMatch(/high|medium/);
    expect(result.stance.stance).not.toMatch(/Buy|Sell|Hold/);
    expect(result.positiveDrivers.length).toBeGreaterThanOrEqual(0);
  });

  it('returns null score when too few factors exist', () => {
    const result = computeResearchScore({ pe: 15.5 });
    expect(result.overallScore).toBeNull();
    expect(result.activeFactorCount).toBe(1);
    expect(result.stance.stance).toBe('Not enough information');
  });

  it('returns null for null input', () => {
    const result = computeResearchScore(null);
    expect(result.overallScore).toBeNull();
    expect(result.activeFactorCount).toBe(0);
    expect(result.stance.stance).toBe('Not enough information');
  });

  it('confidence drops when fewer dimensions are active', () => {
    const full = computeResearchScore({
      pe: 15.5, pb: 2.1, roe: 0.18, roic: 0.14, operating_margin: 0.22,
      revenue_growth: 0.12, profit_growth: 0.08, eps_growth: 0.1,
      debt_equity: 0.45, current_ratio: 1.8, market_cap: 500000000000,
    });
    expect(full.confidence).toBe('high');

    const partial = computeResearchScore({ pe: 15.5 });
    expect(partial.confidence).toBe('low');
    expect(partial.overallScore).toBeNull();
  });

  it('recommendationPolicy never returns public Buy/Sell/Hold', () => {
    const result = computeResearchScore({
      pe: 15.5, pb: 2.1, roe: 0.18, operating_margin: 0.22,
      revenue_growth: 0.12, profit_growth: 0.08,
      debt_equity: 0.45,
    });
    expect(result.stance.stance).not.toMatch(/Buy|Sell|Hold/);
    expect(result.stance.stance).toMatch(/High conviction|Watch|Needs review|Risk rising|Thesis improving|Avoid for now|Not enough information/);
  });
});

describe('inputMapping', () => {
  it('maps company data to research output', () => {
    const result = mapCompanyDataToResearch('RELIANCE', {
      pe: 15.5, pb: 2.1, roe: 0.18, operating_margin: 0.22,
      revenue_growth: 0.12,
    });
    expect(result.predictionView.symbol).toBe('RELIANCE');
    expect(result.healthometerView.dimensions.length).toBe(6);
    expect(result.researchScore.stance.stance).not.toMatch(/Buy|Sell|Hold/);
  });
});
