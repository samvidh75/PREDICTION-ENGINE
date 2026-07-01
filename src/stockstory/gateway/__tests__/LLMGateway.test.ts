import { describe, it, expect, beforeEach } from 'vitest';
import { LLMGateway } from '../LLMGateway';
import { getLLMGatewayConfig, setLLMGatewayConfig } from '../config';
import { aiObservability } from '../../observability/AiObservability';
import type { LensoryResearchInput } from '../../research/types';

const gateway = new LLMGateway();

function makeResearchInput(): LensoryResearchInput {
  return {
    symbol: 'TEST',
    companyName: 'Test Company Ltd',
    sector: 'Technology',
    score: 68,
    conviction: 60,
    factorScores: { quality: 65, valuation: 55, growth: 60, stability: 70, risk: 40, momentum: 58 },
    factorBreakdowns: {
      quality: { roeScore: 70, roaScore: 65, roicScore: 68, grossMarginScore: 72, operatingMarginScore: 60, efficiencyScore: 65, compositeScore: 67 },
      valuation: { peScore: 60, pbScore: 55, evEbitdaScore: 50, fcfYieldScore: 65, dividendYieldScore: 50, compositeScore: 56 },
      growth: { revenueGrowthScore: 65, epsGrowthScore: 60, fcfGrowthScore: 55, profitGrowthScore: 58, compositeScore: 60 },
      momentum: { rsiScore: 60, macdScore: 55, adxScore: 50, trendStrengthScore: 55, compositeScore: 55 },
    },
    topPositiveDrivers: ['Strong revenue growth'],
    topNegativeDrivers: ['Elevated valuation'],
    riskFlags: [],
    valuationContext: { peScore: 60, pbScore: 55, evEbitdaScore: 50, fcfYieldScore: 65, dividendYieldScore: 50, compositeScore: 56 },
    growthContext: { revenueGrowthScore: 65, epsGrowthScore: 60, fcfGrowthScore: 55, profitGrowthScore: 58, compositeScore: 60 },
    qualityContext: { roeScore: 70, roaScore: 65, roicScore: 68, grossMarginScore: 72, operatingMarginScore: 60, efficiencyScore: 65, compositeScore: 67 },
    momentumContext: { rsiScore: 60, macdScore: 55, adxScore: 50, trendStrengthScore: 55, compositeScore: 55 },
    whatChangedInputs: [],
    dataCompletenessForInternalUseOnly: 85,
  };
}

describe('LLMGateway', () => {
  beforeEach(() => {
    setLLMGatewayConfig({ mode: 'deterministic' });
    aiObservability.clear();
  });

  it('default mode is deterministic', () => {
    expect(getLLMGatewayConfig().mode).toBe('deterministic');
  });

  it('generates thesis in deterministic mode', () => {
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    expect(result.thesis).toBeTruthy();
    expect(result.bullCase).toBeTruthy();
    expect(result.bearCase).toBeTruthy();
  });

  it('output passes validation', () => {
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    expect(result.thesis).toBeTruthy();
    expect(result.complianceSafeLabel).toBeTruthy();
  });

  it('parses scanner queries', () => {
    const result = gateway.parseScannerQuery('undervalued quality');
    expect(result.filters.length).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('handles empty scanner query', () => {
    const result = gateway.parseScannerQuery('');
    expect(result.confidence).toBe(0);
    expect(result.filters.length).toBe(0);
  });

  it('generates alert explanations', () => {
    const result = gateway.explainScoreChange({
      symbol: 'RELIANCE',
      changeType: 'score_change',
      oldValue: 65,
      newValue: 72,
      context: 'Improved fundamentals',
    });
    expect(result).toContain('RELIANCE');
    expect(result).toContain('improved');
  });

  it('generates compare summary', () => {
    const result = gateway.generateCompareSummary({
      symbols: ['RELIANCE', 'TCS'],
      scores: { RELIANCE: 72, TCS: 68 },
      factorComparison: { RELIANCE: { quality: 75, growth: 70 }, TCS: { quality: 80, growth: 60 } },
    });
    expect(result).toContain('RELIANCE');
    expect(result).toContain('TCS');
  });

  it('all fields are populated', () => {
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    const fields = ['thesis', 'bullCase', 'bearCase', 'whatChanged', 'whyItMatters', 'keyRisks', 'watchNext', 'peerContextSummary', 'confidenceNote', 'methodologyNote', 'complianceSafeLabel'];
    for (const field of fields) {
      expect(result[field as keyof typeof result]).toBeTruthy();
    }
  });

  it('no forbidden copy in output', () => {
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    const full = Object.values(result).join(' ').toLowerCase();
    expect(full).not.toContain('buy now');
    expect(full).not.toContain('sell');
    expect(full).not.toContain('guaranteed');
    expect(full).not.toContain('price target');
    expect(full).not.toContain('multibagger');
    expect(full).not.toContain('provider status');
  });

  it('emits observability events', () => {
    const input = makeResearchInput();
    gateway.generateThesis(input);
    const stats = aiObservability.getStats();
    expect(stats.totalEvents).toBeGreaterThanOrEqual(1);
  });

  it('mock mode returns fixture output', () => {
    setLLMGatewayConfig({ mode: 'mock' });
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    expect(result.thesis).toContain('Mock');
  });

  it('disabled mode returns unavailable state', () => {
    setLLMGatewayConfig({ mode: 'disabled' });
    const input = makeResearchInput();
    const result = gateway.generateThesis(input);
    expect(result.thesis).toContain('not available');
  });
});
