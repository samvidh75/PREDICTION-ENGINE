import { describe, expect, it } from 'vitest';
import {
  MARKET_BRAIN_ALLOWED_STATES,
  MARKET_BRAIN_EVIDENCE_DOMAINS,
  MARKET_BRAIN_FACTOR_KEYS,
  assertMarketBrainCopyIsCompliant,
  containsForbiddenRecommendationLanguage,
} from './marketBrainGuardrails';

describe('marketBrainGuardrails', () => {
  it('allows research-oriented states and copy', () => {
    expect(() => assertMarketBrainCopyIsCompliant('Thesis improving. Risk rising. Needs review.')).not.toThrow();
  });

  it('blocks direct recommendation language before compliance review', () => {
    expect(containsForbiddenRecommendationLanguage('This is a Strong Buy')).toBe(true);
    expect(() => assertMarketBrainCopyIsCompliant('Buy now for guaranteed return')).toThrow();
  });

  it('keeps the public research states stable and recommendation-neutral', () => {
    expect(MARKET_BRAIN_ALLOWED_STATES).toEqual([
      'High conviction',
      'Thesis improving',
      'Watch',
      'Needs review',
      'Risk rising',
      'Avoid for now',
    ]);
    expect(MARKET_BRAIN_ALLOWED_STATES.some(containsForbiddenRecommendationLanguage)).toBe(false);
  });

  it('keeps evidence domains stable for frontend and backend normalization', () => {
    expect(MARKET_BRAIN_EVIDENCE_DOMAINS).toEqual([
      'instrument_master',
      'prices',
      'fundamentals',
      'financial_statements',
      'shareholding',
      'corporate_actions',
      'news_events',
      'technicals',
      'sector_context',
      'ownership',
      'derivatives',
    ]);
    expect(new Set(MARKET_BRAIN_EVIDENCE_DOMAINS).size).toBe(MARKET_BRAIN_EVIDENCE_DOMAINS.length);
  });

  it('keeps factor keys aligned with the public research view order', () => {
    expect(MARKET_BRAIN_FACTOR_KEYS).toEqual([
      'quality',
      'growth',
      'valuation',
      'stability',
      'momentum',
      'risk',
      'ownership',
    ]);
    expect(new Set(MARKET_BRAIN_FACTOR_KEYS).size).toBe(MARKET_BRAIN_FACTOR_KEYS.length);
  });
});
