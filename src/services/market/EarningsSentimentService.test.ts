import { describe, expect, it } from 'vitest';
import { EarningsSentimentService } from './EarningsSentimentService';

describe('EarningsSentimentService', () => {
  it('builds derived earnings calendar entries', () => {
    const service = new EarningsSentimentService();
    const result = service.buildEstimatedEarningsCalendar(['infy', 'TCS']);

    expect(result).toHaveLength(2);
    expect(result[0].availability).toBe('derived');
    expect(result[0].symbol).toBe('INFY');
  });

  it('builds a narrative preview from sentiment context', () => {
    const service = new EarningsSentimentService();
    const preview = service.buildEarningsNarrativePreview('INFY', {
      symbol: 'INFY',
      availability: 'real',
      methodology: 'headline_lexicon',
      score: 0.4,
      sentiment: 'positive',
      headlineCount: 4,
      headlines: [],
    });

    expect(preview.executiveNarrative).toContain('INFY');
    expect(preview.confidenceEnvironmentLabel).toBeTruthy();
  });
});
