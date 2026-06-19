import { describe, expect, it } from 'vitest';
import { computeFactorScores, countActiveFactors, getTopFactors, getBottomFactors } from '../factorScoring';
import { computeDimensionScores } from '../dimensionScoring';
import { computeResearchScore } from '../researchScore';
import { mapCompanyDataToResearch, mapFinancialsToResearch } from '../inputMapping';
import { mapScoreToStance } from '../recommendationPolicy';

const FULL_DATA = {
  pe: 15.5, pb: 2.1, ev_ebitda: 12.3, dividend_yield: 0.025,
  roe: 0.18, roic: 0.14, roa: 0.08, operating_margin: 0.22, net_margin: 0.12,
  revenue_growth: 0.12, profit_growth: 0.08, eps_growth: 0.1,
  debt_equity: 0.45, current_ratio: 1.8, market_cap: 500000000000,
  eps: 45, sales: 150000000000, book_value: 350,
};

describe('factorScoring', () => {
  it('computes scores from real PE/PB/ROE/debt/growth inputs (18 factors)', () => {
    const scores = computeFactorScores(FULL_DATA);
    expect(scores.pe_ratio).toBe(60);
    expect(scores.pb_ratio).toBe(55);
    expect(scores.ev_ebitda).toBe(45);
    expect(scores.dividend_yield).toBe(65);
    expect(scores.roe).toBe(75);
    expect(scores.roic).toBe(60);
    expect(scores.roa).toBe(70);
    expect(scores.operating_margin).toBe(75);
    expect(scores.net_margin).toBe(70);
    expect(scores.revenue_growth).toBe(60);
    expect(scores.profit_growth).toBe(45);
    expect(scores.eps_growth).toBe(60);
    expect(scores.debt_equity).toBe(60);
    expect(scores.current_ratio).toBe(85);
    expect(scores.market_cap).toBe(85);
    expect(scores.eps).toBe(60);
    expect(scores.sales).toBe(75);
    expect(scores.book_value).toBe(55);

    expect(countActiveFactors(scores)).toBe(18);
  });

  it('missing factors return null and do not affect score', () => {
    const scores = computeFactorScores({ pe: 15.5 });
    expect(scores.pe_ratio).toBe(60);
    expect(scores.pb_ratio).toBeNull();
    expect(scores.roe).toBeNull();
    expect(scores.roa).toBeNull();
    expect(scores.net_margin).toBeNull();
    expect(countActiveFactors(scores)).toBe(1);
  });

  it('planned factors never affect score', () => {
    const scores = computeFactorScores({ pe: 15.5, ps: 1.5, peg: 1.2 });
    expect(scores.pe_ratio).toBe(60);
    expect(Object.keys(scores).length).toBeLessThanOrEqual(18);
  });

  it('valid zero values are preserved', () => {
    const scores = computeFactorScores({ revenue_growth: 0, profit_growth: -0.05, eps_growth: 0, roe: 0 });
    expect(scores.revenue_growth).toBe(30);
    expect(scores.profit_growth).toBe(10);
    expect(scores.eps_growth).toBe(30);
    expect(scores.roe).toBe(10);
  });

  it('invalid numeric values normalize to null', () => {
    const scores = computeFactorScores({ pe: NaN, roe: Infinity, debt_equity: undefined });
    expect(scores.pe_ratio).toBeNull();
    expect(scores.roe).toBeNull();
    expect(scores.debt_equity).toBeNull();
  });

  it('dividend yield trap: very high yield does not automatically score highest', () => {
    const highYield = computeFactorScores({ pe: 15.5, dividend_yield: 0.08 });
    expect(highYield.dividend_yield).toBe(60);
    const moderateYield = computeFactorScores({ pe: 15.5, dividend_yield: 0.04 });
    expect(moderateYield.dividend_yield).toBe(75);
  });

  it('getTopFactors returns highest scoring factors', () => {
    const scores = computeFactorScores(FULL_DATA);
    const top = getTopFactors(scores, 3);
    expect(top.length).toBe(3);
    expect(top[0].score).toBeGreaterThanOrEqual(top[1].score);
  });

  it('getBottomFactors returns lowest scoring factors', () => {
    const scores = computeFactorScores(FULL_DATA);
    const bottom = getBottomFactors(scores, 3);
    expect(bottom.length).toBe(3);
    expect(bottom[0].score).toBeLessThanOrEqual(bottom[1].score);
  });
});

describe('dimensionScoring', () => {
  it('computes partial dimensions from available factors', () => {
    const factorScores = computeFactorScores(FULL_DATA);
    const result = computeDimensionScores(factorScores);
    expect(result.activeDimensionCount).toBe(6);
    expect(result.totalDimensionCount).toBe(7);

    const quality = result.dimensions.find(d => d.id === 'quality');
    expect(quality?.score).toBe(70);

    const valuation = result.dimensions.find(d => d.id === 'valuation');
    expect(valuation?.score).toBe(56);

    const momentum = result.dimensions.find(d => d.id === 'momentum');
    expect(momentum?.score).toBeNull();
  });

  it('dimension confidence is not high with only one factor', () => {
    const factorScores = computeFactorScores({ pe: 15.5 });
    const result = computeDimensionScores(factorScores);
    const valuation = result.dimensions.find(d => d.id === 'valuation');
    expect(valuation?.activeFactorCount).toBe(1);
    expect(valuation?.confidence).not.toBe('high');
  });

  it('risk dimension direction is correct (negative means risk is high)', () => {
    const factorScores = computeFactorScores({ debt_equity: 1.2 });
    const result = computeDimensionScores(factorScores);
    const risk = result.dimensions.find(d => d.id === 'risk');
    expect(risk?.score).toBeLessThan(50);
    expect(risk?.direction).toBe('negative');
  });
});

describe('researchScore', () => {
  it('computes overall score only when enough active factors exist', () => {
    const result = computeResearchScore(FULL_DATA);
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

  it('confidence separates from score (high score + low data = medium/low confidence)', () => {
    const result = computeResearchScore({ pe: 15.5, roe: 0.2 });
    expect(result.overallScore).toBeNull();
    expect(result.confidence).toBe('low');
  });

  it('confidence drops when fewer dimensions are active', () => {
    const partial = computeResearchScore({ pe: 15.5 });
    expect(partial.confidence).toBe('low');
    expect(partial.overallScore).toBeNull();
  });

  it('recommendationPolicy never returns public Buy/Sell/Hold', () => {
    const result = computeResearchScore(FULL_DATA);
    expect(result.stance.stance).not.toMatch(/Buy|Sell|Hold/);
    expect(result.stance.stance).toMatch(
      /High conviction|Watch|Needs review|Risk rising|Thesis improving|Avoid for now|Not enough information/
    );
  });

  it('mapFinancialsToResearch works with null', () => {
    const result = mapFinancialsToResearch(null);
    expect(result.overallScore).toBeNull();
  });

  it('mapFinancialsToResearch with partial data is safe', () => {
    const result = mapFinancialsToResearch({ pe: 15.5, roe: 0.18 });
    expect(result.activeFactorCount).toBe(2);
    expect(result.overallScore).toBeNull();
  });
});

describe('recommendationPolicy', () => {
  it('high score + low confidence does not become High conviction', () => {
    const stance = mapScoreToStance(80, 10, 35);
    expect(stance.stance).not.toBe('High conviction');
    expect(stance.stance).toMatch(/Watch|Thesis improving|Needs review/);
  });

  it('medium score + high risk maps to Needs review', () => {
    const stance = mapScoreToStance(60, 42, 80);
    expect(stance.stance).toBe('Needs review');
  });

  it('low score + high confidence maps to Needs review', () => {
    const stance = mapScoreToStance(30, 10, 80);
    expect(stance.stance).toBe('Needs review');
  });

  it('insufficient data maps to Not enough information', () => {
    const stance = mapScoreToStance(null, null, 0);
    expect(stance.stance).toBe('Not enough information');
  });

  it('never returns Buy/Sell/Hold', () => {
    const scores = [null, 0, 30, 50, 70, 90, 100];
    const risks = [null, 0, 30, 50, 70, 90];
    for (const s of scores) {
      for (const r of risks) {
        const stance = mapScoreToStance(s, r, 80);
        expect(stance.stance).not.toMatch(/Buy|Sell|Hold/);
        expect(stance.stance).toMatch(
          /High conviction|Watch|Needs review|Risk rising|Thesis improving|Avoid for now|Not enough information/
        );
      }
    }
  });
});

describe('inputMapping', () => {
  it('maps company data to research output', () => {
    const result = mapCompanyDataToResearch('RELIANCE', FULL_DATA);
    expect(result.predictionView.symbol).toBe('RELIANCE');
    expect(result.healthometerView.dimensions.length).toBe(6);
    expect(result.researchScore.stance.stance).not.toMatch(/Buy|Sell|Hold/);
  });
});
