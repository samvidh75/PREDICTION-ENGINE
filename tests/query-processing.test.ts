import { describe, it, expect } from 'vitest';

describe('Query Processing Pipeline', () => {
  it('Regex: Should parse P/E queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('P/E under 15');
    expect(result.pe).toEqual({ operator: '<', value: 15 });
    expect(result.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('Regex: Should parse ROE queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('ROE over 20');
    expect(result.roe).toEqual({ operator: '>', value: 20 });
  });

  it('Regex: Should parse complex queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('P/E under 20 and ROE over 25 with dividend over 2');
    expect(result.pe).toBeDefined();
    expect(result.roe).toBeDefined();
    expect(result.dividend).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0.8);
  });

  it('Confidence: Should be high for structured queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('P/E < 15 and ROE > 20%');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('Confidence: Should be lower for unstructured queries', async () => {
    const { SmartQueryParser } = await import('../src/services/SmartQueryParser');
    const result = SmartQueryParser.parseQuery('Find good stocks');
    expect(result.confidence).toBeLessThan(0.8);
  });
});
