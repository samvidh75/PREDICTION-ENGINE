import { describe, it, expect } from 'vitest';
import { llmGateway } from '../../src/services/AI/LLMGateway';
import { sglangService } from '../../src/services/AI/SGLangService';
import { routellmService } from '../../src/services/AI/RouteLLMService';

describe('LLM Integration Flow', () => {
  it('should report health of both services', async () => {
    const health = await llmGateway.health();
    expect(health).toHaveProperty('sglang');
    expect(health).toHaveProperty('routellm');
  });

  it('should route simple queries', async () => {
    const result = await routellmService.routeQuery(
      'What is PE ratio?',
      { isPro: false }
    );
    expect(result).toHaveProperty('answer');
    expect(result).toHaveProperty('routedTo');
    expect(result).toHaveProperty('costEstimate');
  });

  it('should handle stock analysis gracefully', async () => {
    const analysis = await sglangService.analyzeStockParallel('TCS', {
      peRatio: 28,
      roe: 46,
      roic: 38,
      revenueGrowth: 8,
      profitGrowth: 10,
      grossMargin: 45,
      debtEquity: 0.1,
      currentRatio: 3.0,
    });

    expect(analysis).toHaveProperty('quality');
    expect(analysis).toHaveProperty('valuation');
    expect(analysis).toHaveProperty('growth');
    expect(analysis).toHaveProperty('risk');
  });

  it('should generate cached thesis', async () => {
    const thesis = await llmGateway.generateThesis('TCS', {
      peRatio: 28,
      roe: 46,
      revenueGrowth: 8,
    }, false);

    expect(typeof thesis).toBe('string');
    expect(thesis.length).toBeGreaterThan(0);
  });
});
