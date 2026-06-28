import { describe, it, expect } from 'vitest';
import { GrowthContentOpportunityEngine } from '../GrowthContentOpportunityEngine';

describe('GrowthContentOpportunityEngine', () => {
  const engine = new GrowthContentOpportunityEngine();

  it('identifies opportunities from failed searches', () => {
    const opportunities = engine.addFailedSearch({
      query: 'How to analyze FMCG sector PE ratios',
      userId: 'user_1',
      timestamp: new Date().toISOString(),
    });
    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('identifies opportunities from quality feedback', () => {
    const opportunities = engine.addQualityFeedback({
      symbol: 'RELIANCE',
      component: 'thesis',
      issue: 'Missing competitive analysis',
      userId: 'user_2',
      timestamp: new Date().toISOString(),
    });
    expect(Array.isArray(opportunities)).toBe(true);
  });

  it('scores opportunities by frequency', () => {
    for (let i = 0; i < 5; i++) {
      engine.addFailedSearch({
        query: 'Small cap value screener',
        userId: `user_${i}`,
        timestamp: new Date().toISOString(),
      });
    }

    const ranked = engine.getRankedOpportunities();
    expect(ranked.length).toBeGreaterThan(0);
    // Most frequent should be at top
    expect(ranked[0].frequency).toBeGreaterThanOrEqual(ranked[ranked.length - 1]?.frequency ?? 0);
  });

  it('categorizes opportunities', () => {
    const opportunities = engine.getRankedOpportunities();
    for (const opp of opportunities) {
      expect(['content_gap', 'feature_request', 'data_quality']).toContain(opp.category);
    }
  });

  it('resets state', () => {
    const e2 = new GrowthContentOpportunityEngine();
    e2.addFailedSearch({ query: 'Test', userId: 'user_1', timestamp: new Date().toISOString() });
    e2.reset();
    expect(e2.getRankedOpportunities().length).toBe(0);
  });
});
