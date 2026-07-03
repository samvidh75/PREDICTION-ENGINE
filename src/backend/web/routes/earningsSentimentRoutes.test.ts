import Fastify from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { registerEarningsSentimentRoutes } from './earningsSentimentRoutes';

vi.mock('../../../services/market/EarningsSentimentService.js', () => ({
  earningsSentimentService: {
    buildEstimatedEarningsCalendar: (symbols: string[]) => symbols.map((symbol) => ({
      symbol: symbol.toUpperCase(),
      eventType: 'earnings',
      estimatedDate: '2026-10-01T00:00:00.000Z',
      availability: 'derived',
      rationale: 'estimated',
    })),
    summarizeHeadlineSentiment: async (symbol: string) => ({
      symbol,
      availability: 'real',
      methodology: 'headline_lexicon',
      score: 0.3,
      sentiment: 'positive',
      headlineCount: 2,
      headlines: [],
    }),
    buildEarningsNarrativePreview: () => ({
      executiveNarrative: 'Preview',
      keyOperationalChanges: [],
      businessQualityNarrative: '',
      managementToneNarrative: '',
      institutionalReactionNarrative: '',
      marginAndEfficiencyNarrative: '',
      guidanceInterpretationNarrative: '',
      riskEvolutionNarrative: '',
      riskFlags: [],
      longTermTimeline: [],
      confidenceEnvironmentLabel: 'Constructive',
    }),
  },
}));

describe('registerEarningsSentimentRoutes', () => {
  it('returns derived calendar entries', async () => {
    const app = Fastify();
    await registerEarningsSentimentRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/earnings/calendar?symbols=INFY,TCS',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().entries).toHaveLength(2);
  });

  it('returns normalized sentiment summary', async () => {
    const app = Fastify();
    await registerEarningsSentimentRoutes(app);

    const res = await app.inject({
      method: 'GET',
      url: '/api/news/INFY/sentiment',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().summary.sentiment).toBe('positive');
    expect(res.json().earningsNarrativePreview.executiveNarrative).toBe('Preview');
  });
});
