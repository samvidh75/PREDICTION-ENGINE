import { describe, it, expect } from 'vitest';

describe('100% Free Services Verification', () => {
  it('Regex parser should handle PE queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('Find stocks with P/E under 15');
    expect(result.pe?.operator).toBe('<');
    expect(result.pe?.value).toBe(15);
  });

  it('Regex parser should handle ROE queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('ROE over 20%');
    expect(result.roe?.operator).toBe('>');
    expect(result.roe?.value).toBe(20);
  });

  it('Should report high confidence for structured queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('P/E under 15 and ROE over 20');
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('Analytics should track metrics locally', async () => {
    const { getAggregatedMetrics, trackQueryMetrics } = await import('../src/utils/analytics');

    trackQueryMetrics('regex', 5, 'test query', true);
    trackQueryMetrics('regex', 3, 'another query', true);

    const metrics = getAggregatedMetrics();
    expect(metrics.totalQueries).toBe(2);
    expect(metrics.methods.regex.count).toBe(2);
  });
});
