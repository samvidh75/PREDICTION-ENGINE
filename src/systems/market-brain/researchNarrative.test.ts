import { describe, expect, it } from 'vitest';
import { buildMarketBrainNarrative, renderMarketBrainNarrative } from './researchNarrative';
import type { IndiaMarketBrainResult } from './indiaMarketBrain';

const baseResult: IndiaMarketBrainResult = {
  symbol: 'SAMPLE',
  companyName: 'Sample Limited',
  researchState: 'Watch',
  convictionScore: 58,
  quality: { score: 58, drivers: [], risks: [] },
  growth: { score: 58, drivers: [], risks: [] },
  valuation: { score: 58, drivers: [], risks: [] },
  stability: { score: 58, drivers: [], risks: [] },
  momentum: { score: 58, drivers: [], risks: [] },
  risk: { score: 42, drivers: [], risks: [] },
  ownership: { score: 58, drivers: [], risks: [] },
  thesis: ['More research evidence is needed before forming a stronger thesis.'],
  risksToReview: [],
  whatToWatch: ['Next result and margin trend.'],
  missingEvidence: [],
  partialEvidence: [],
  complianceNote: 'Research-only output.',
  generatedAt: '2026-06-27T00:00:00.000Z',
};

describe('market brain research narrative', () => {
  it('renders neutral research copy with safe fallbacks', () => {
    const narrative = buildMarketBrainNarrative(baseResult);
    const rendered = renderMarketBrainNarrative(baseResult);

    expect(narrative.headline).toBe('Sample Limited is marked Watch with 58/100 conviction.');
    expect(narrative.risks).toEqual(['No dominant signal yet.']);
    expect(rendered).toContain('Risks to review');
    expect(rendered).toContain('Research-only output.');
  });

  it('rejects direct recommendation language before rendering', () => {
    expect(() => buildMarketBrainNarrative({
      ...baseResult,
      thesis: ['Strong Buy setup.'],
    })).toThrow('Market brain copy contains recommendation language');
  });
});
