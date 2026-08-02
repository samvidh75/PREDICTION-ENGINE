/**
 * News Engine Tests
 *
 * Verifies that the 4-module News/Sentiment aggregator scores news correctly.
 */
import { describe, it, expect } from 'vitest';
import { NewsEngine } from '../engines/NewsEngine/index';
import type { NewsMetrics, NewsArticle } from '../types';

const engine = new NewsEngine();

function makeArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    headline: 'Company reports strong quarterly profit growth',
    source: 'Economic Times',
    time: new Date().toISOString(),
    ...overrides,
  };
}

function makeMetrics(articles: NewsArticle[]): NewsMetrics {
  return { articles, symbol: 'TCS', lastUpdated: new Date() };
}

describe('NewsEngine', () => {
  it('scores a bullish news environment high', async () => {
    const articles = [
      makeArticle({ headline: 'Record profit and revenue growth, expansion plans announced' }),
      makeArticle({ headline: 'Company beats estimates, upgrades guidance, strong momentum' }),
      makeArticle({ headline: 'New partnership and contract wins boost outlook', source: 'Reuters' }),
      makeArticle({ headline: 'Stock rallies on positive analyst upgrade', source: 'Bloomberg' }),
      makeArticle({ headline: 'Dividend announced, buyback program launched', source: 'Mint' }),
      makeArticle({ headline: 'Market leader expands into new geographies', source: 'CNBC' }),
    ];
    const result = await engine.analyze(makeMetrics(articles));
    expect(result.overall).toBeGreaterThanOrEqual(60);
    expect(result.sentiment).toBe('bullish');
    expect(result.articleCount).toBe(6);
  });

  it('scores a bearish news environment low', async () => {
    const articles = [
      makeArticle({ headline: 'Company reports sharp loss, revenue decline continues' }),
      makeArticle({ headline: 'Analyst downgrade on weak outlook and debt concerns' }),
      makeArticle({ headline: 'Lawsuit filed, investigation launched into fraud allegations' }),
      makeArticle({ headline: 'Stock crashes on earnings miss and layoff announcement' }),
    ];
    const result = await engine.analyze(makeMetrics(articles));
    expect(result.overall).toBeLessThanOrEqual(55);
    expect(result.sentiment).toBe('bearish');
  });

  it('scores no articles at baseline', async () => {
    const result = await engine.analyze(makeMetrics([]));
    expect(result.overall).toBeLessThanOrEqual(45);
    expect(result.articleCount).toBe(0);
    expect(result.dataCompleteness).toBe(0);
  });

  it('rewards high-credibility sources', async () => {
    const credibleArticles = [
      makeArticle({ headline: 'Profit rises 15%', source: 'Reuters' }),
      makeArticle({ headline: 'Growth accelerates', source: 'Bloomberg' }),
      makeArticle({ headline: 'New product launch', source: 'Economic Times' }),
    ];
    const credibleResult = await engine.analyze(makeMetrics(credibleArticles));

    const lowCredArticles = [
      makeArticle({ headline: 'Profit rises 15%', source: 'UnknownBlog' }),
      makeArticle({ headline: 'Growth accelerates', source: 'RandomSite' }),
    ];
    const lowCredResult = await engine.analyze(makeMetrics(lowCredArticles));

    expect(credibleResult.credibilityScore).toBeGreaterThan(lowCredResult.credibilityScore);
  });

  it('penalizes stale news for recency', async () => {
    const oldArticle = makeArticle({
      headline: 'Old news',
      time: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days old
    });
    const oldResult = await engine.analyze(makeMetrics([oldArticle]));
    expect(oldResult.recencyScore).toBeLessThanOrEqual(8);
  });

  it('detects mixed sentiment correctly', async () => {
    const articles = [
      makeArticle({ headline: 'Profit rises but concerns remain about debt levels' }),
      makeArticle({ headline: 'Growth strong, valuation a concern say analysts' }),
    ];
    const result = await engine.analyze(makeMetrics(articles));
    // Should be neutral or close to neutral since keywords are mixed
    expect(result.sentimentScore).toBeGreaterThanOrEqual(10);
    expect(result.sentimentScore).toBeLessThanOrEqual(30);
  });

  it('returns valid output keys', async () => {
    const articles = [makeArticle()];
    const result = await engine.analyze(makeMetrics(articles));
    expect(result).toHaveProperty('overall');
    expect(result).toHaveProperty('volumeScore');
    expect(result).toHaveProperty('sentimentScore');
    expect(result).toHaveProperty('credibilityScore');
    expect(result).toHaveProperty('recencyScore');
    expect(result).toHaveProperty('sentiment');
    expect(result).toHaveProperty('topKeywords');
    expect(result.details).toHaveProperty('volume');
    expect(result.details).toHaveProperty('sentiment');
    expect(result.details).toHaveProperty('credibility');
    expect(result.details).toHaveProperty('recency');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('reasoning');
    expect(['bullish', 'bearish', 'neutral', 'unknown']).toContain(result.sentiment);
  });

  it('handles many articles with volume penalty', async () => {
    const articles = Array.from({ length: 25 }, (_, i) =>
      makeArticle({ headline: `News article ${i + 1} about market movement` })
    );
    const result = await engine.analyze(makeMetrics(articles));
    expect(result.volumeScore).toBeLessThanOrEqual(28); // Should be penalized for extreme volume
  });
});
