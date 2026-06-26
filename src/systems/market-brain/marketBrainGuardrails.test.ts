import { describe, expect, it } from 'vitest';
import { assertMarketBrainCopyIsCompliant, containsForbiddenRecommendationLanguage } from './marketBrainGuardrails';

describe('marketBrainGuardrails', () => {
  it('allows research-oriented states and copy', () => {
    expect(() => assertMarketBrainCopyIsCompliant('Thesis improving. Risk rising. Needs review.')).not.toThrow();
  });

  it('blocks direct recommendation language before compliance review', () => {
    expect(containsForbiddenRecommendationLanguage('This is a Strong Buy')).toBe(true);
    expect(() => assertMarketBrainCopyIsCompliant('Buy now for guaranteed return')).toThrow();
  });
});
