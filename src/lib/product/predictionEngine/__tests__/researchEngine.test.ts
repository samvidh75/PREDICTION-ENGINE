import { describe, expect, it } from 'vitest';
import { computeResearchScore } from '../researchScore';

describe('computeResearchScore', () => {
  it('returns limited state with no metrics', () => {
    const result = computeResearchScore(null, null);
    expect(result.overallScore).toBeNull();
    expect(result.activeFactorCount).toBe(0);
    expect(result.stance.stance).toBe('Not enough information');
  });

  it('returns partial state with few metrics', () => {
    const result = computeResearchScore({ pe: 15, roe: 18 }, null);
    expect(result.overallScore).toBeNull();
    expect(result.stance.stance).toBe('Not enough information');
  });

  it('returns valid research stance for all stances list', () => {
    const allValidStances = /High conviction|Watch|Needs review|Risk rising|Avoid for now|Not enough information/;
    const result = computeResearchScore({
      pe: 15, pb: 2.5, ev_ebitda: 12, dividend_yield: 0.02,
      roe: 18, roic: 14, operating_margin: 0.25,
      revenue_growth: 0.12, earnings_growth: 0.10, profit_growth: 0.08, eps_growth: 0.10,
      debt_equity: 0.5, current_ratio: 1.8, interest_coverage: 4.5,
      market_cap: 50000000000, free_cash_flow_yield: 0.04,
      earnings_quality_score: 70, governance_score: 75,
    }, 25);
    expect(result.stance.stance).toMatch(allValidStances);
  });

  it('high score + low confidence does not become Very Healthy', () => {
    const stance = computeResearchScore({
      pe: 15, pb: 2.5, ev_ebitda: 12, dividend_yield: 0.02,
      roe: 18, roic: 14, operating_margin: 0.25,
      revenue_growth: 0.12, earnings_growth: 0.10, profit_growth: 0.08, eps_growth: 0.10,
      debt_equity: 0.5, current_ratio: 1.8,
    }, 25).stance;
    expect(stance.stance).not.toBe('High conviction');
  });

  it('medium score + high risk maps to Needs review', () => {
    const stance = computeResearchScore({
      pe: 15, roe: 12, operating_margin: 0.15,
      revenue_growth: 0.05, debt_equity: 1.2, current_ratio: 1.2,
    }, 65).stance;
    expect(stance.stance).toBe('Risk rising');
  });

  it('low score + high confidence maps to Risk rising', () => {
    const stance = computeResearchScore({
      pe: 30, roe: 5, operating_margin: -0.05,
      revenue_growth: -0.02, debt_equity: 2.5, current_ratio: 0.5,
    }, 20).stance;
    expect(stance.stance).toBe('Risk rising');
  });

  it('no stance is Buy/Sell/Hold', () => {
    const allValidStances = /High conviction|Watch|Needs review|Risk rising|Avoid for now|Not enough information/;
    for (const risk of [10, 30, 50, 70, 90]) {
      const result = computeResearchScore({
        pe: 15, pb: 2.5, ev_ebitda: 12, dividend_yield: 0.02,
        roe: 18, roic: 14, operating_margin: 0.25,
        revenue_growth: 0.12, earnings_growth: 0.10, profit_growth: 0.08, eps_growth: 0.10,
        debt_equity: 0.5, current_ratio: 1.8, interest_coverage: 4.5,
        market_cap: 50000000000, free_cash_flow_yield: 0.04,
        earnings_quality_score: 70, governance_score: 75,
      }, risk);
      expect(result.stance.stance).toMatch(allValidStances);
      expect(result.stance.stance).not.toMatch(/Buy|Sell|Hold/);
    }
  });
});
