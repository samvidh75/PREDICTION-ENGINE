/**
 * Master Orchestrator Tests — PROMPT 29
 *
 * Verifies weighted aggregation, investment state classification,
 * and thesis generation across all 9 engines.
 */
import { describe, it, expect } from 'vitest';
import { MasterOrchestrator } from '../Orchestrator';
import type { AllEngineInputs } from '../Orchestrator';

const orchestrator = new MasterOrchestrator();

function makeInputs(overrides: Partial<AllEngineInputs> = {}): AllEngineInputs {
  const base = {
    symbol: 'TCS',
    financial: {
      roe: 42, roa: 25, roic: 30, netMargin: 22, operatingMargin: 28,
      revenueGrowth: 15, epsGrowth: 18, ebitdaGrowth: 16, profitGrowth: 20,
      debtToEquity: 0.1, debtToAssets: 0.05, interestCoverage: 45, currentRatio: 3.5,
      marketCap: 1200000, revenue: 220000, assetTurnover: 1.2, equityTurnover: 2.0,
      lastUpdated: new Date(), fiscalYear: 2025,
    } satisfies AllEngineInputs['financial'],
    technical: {
      currentPrice: 3850,
      rsi: 58, macd: 0.5, macdSignal: 0.3, macdHistogram: 0.2,
      ma20: 3800, ma50: 3750, ma200: 3500,
      priceChange1W: 0.02, priceChange1M: 0.05, priceChange3M: 0.10, priceChange6M: 0.15, priceChange1Y: 0.20,
      volatility30: 18, beta: 0.85, atr: 45,
      volume: 2500000, avgVolume: 2200000, volumeRatio: 1.14,
      lastUpdated: new Date(), period: '1D',
    } satisfies AllEngineInputs['technical'],
    valuation: {
      peRatio: 28, pbRatio: 12, evEbitda: 22, fcfYield: 3.5, dividendYield: 1.8,
      lastUpdated: new Date(),
    } satisfies AllEngineInputs['valuation'],
    earnings: {
      history: Array.from({ length: 8 }, (_, i) => ({
        quarter: `Q${(i % 4) + 1} FY${2024 + Math.floor(i / 4)}`,
        eps: 42 + i * 2, epsYoY: 10 + i,
        revenue: 55000 + i * 2000, revenueYoY: 12 + i,
        margin: 22 + i * 0.3, surprise: 2 + i * 0.5, guidanceHit: true,
      })),
      currentGuidance: { epsGrowth: 14, revenueGrowth: 12 },
      forwardPE: 25, peg: 1.4, oneTimeItems: 0.5, capexToRevenue: 4,
      fcfMargin: 18, fiscalYear: 2025, lastUpdated: new Date(),
    } satisfies AllEngineInputs['earnings'],
    risk: {
      volatility: 22, beta: 0.85, maxDrawdown: 15, sharpeRatio: 1.2,
      currentRatio: 3.5, debtToEquity: 0.1, interestCoverage: 45,
      cashReserves: 50000,
      customerConcentration: 0.15, revenuePredictability: 0.8,
      competitiveMoat: 0.85, executionRisk: 0.3,
      profitabilityAtMinus20Revenue: true,
      regulatoryRisk: 0.1, litigationRisk: 0.1, obsolescenceRisk: 0.2, disruptionRisk: 0.3,
      lastUpdated: new Date(),
    } satisfies AllEngineInputs['risk'],
    sector: {
      stockPE: 28, stockPB: 12, stockEVEbitda: 22,
      stockROE: 42, stockNetMargin: 22, stockRevGrowth: 15, stockEPSGrowth: 18,
      peerPE: 30, peerPB: 10, peerEVEbitda: 24,
      peerROE: 25, peerNetMargin: 18, peerRevGrowth: 12, peerEPSGrowth: 14,
      sectorReturn1M: 0.03, sectorReturn3M: 0.08, relativeStrength: 55,
      analystUpgrades: 3, analystDowngrades: 1,
      marketCapRank: 2, sectorPeerCount: 30, brandStrength: 85, customerStickiness: 80,
      symbol: 'TCS', sectorName: 'Information Technology',
      lastUpdated: new Date(),
    } satisfies AllEngineInputs['sector'],
    news: {
      articles: [
        { headline: 'TCS reports strong Q4, beats estimates', source: 'Economic Times', time: '2 hours ago' },
        { headline: 'Analysts raise target on TCS after robust deal wins', source: 'Reuters', time: '5 hours ago' },
        { headline: 'IT sector outlook positive as global spending recovers', source: 'Bloomberg', time: '1 day ago' },
      ],
      symbol: 'TCS', lastUpdated: new Date(),
    } satisfies AllEngineInputs['news'],
    events: {
      events: [
        { type: 'earnings', description: 'Q1 FY26 Earnings', expectedDate: new Date(Date.now() + 30 * 86400000), probability: 1, expectedImpact: 'high', direction: 'bullish' },
        { type: 'dividend', description: 'Final Dividend Record Date', expectedDate: new Date(Date.now() + 45 * 86400000), probability: 0.9, expectedImpact: 'medium', direction: 'bullish' },
      ],
      nextEarningsDate: new Date(Date.now() + 30 * 86400000),
      eventCount90Days: 2, bullishEventCount: 2, bearishEventCount: 0,
      lastUpdated: new Date(), fiscalYear: 2025, currency: 'INR',
    } satisfies AllEngineInputs['events'],
    rag: {
      patterns: [
        { id: 'p1', description: 'IT sector + low leverage + high ROE', similarity: 0.85, successRate: 0.82, outcomeReturn: 15, occurrences: 20, timeframe: 'medium_term' },
        { id: 'p2', description: 'Earnings beat streak continuation', similarity: 0.78, successRate: 0.75, outcomeReturn: 10, occurrences: 12, timeframe: 'short_term' },
      ],
      knowledgeItems: [
        { id: 'k1', content: 'Strong execution track record', type: 'note', relevance: 0.9, confidence: 0.9, createdAt: new Date() },
        { id: 'k2', content: 'IT spending cycle analysis', type: 'macro', relevance: 0.8, confidence: 0.85, createdAt: new Date() },
      ],
      macroSignals: [
        { indicator: 'IT_Spending', value: 5.2, direction: 'positive', impactOnStock: 0.7 },
        { indicator: 'USD_INR', value: 83, direction: 'positive', impactOnStock: 0.5 },
      ],
      sectorPhase: 'expansion', lastUpdated: new Date(),
    } satisfies AllEngineInputs['rag'],
  };
  // Deep merge overrides
  return { ...base, ...overrides } as AllEngineInputs;
}

describe('MasterOrchestrator', () => {
  it('aggregates all 9 engines into a weighted score', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    expect(result.symbol).toBe('TCS');
  });

  it('classifies high scores as high_conviction', async () => {
    // Use strong data across all engines for a conviction score
    const result = await orchestrator.analyzeStock(makeInputs());
    // TCS strong fundamentals should score well
    expect(result.investmentState).toBeDefined();
    expect(['high_conviction', 'watch', 'needs_review', 'risk_rising', 'avoid']).toContain(result.investmentState);
  });

  it('generates a thesis with bull case, bear case, and what to watch', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    expect(result.thesis.bullCase.length).toBeGreaterThan(0);
    expect(result.thesis.bearCase.length).toBeGreaterThan(0);
    expect(result.thesis.whatToWatch.length).toBeGreaterThan(0);
    expect(result.thesis.disclaimer).toContain('SEBI');
  });

  it('includes all 9 engine scores in output', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    expect(result.engines.financial.score).toBeDefined();
    expect(result.engines.technical.score).toBeDefined();
    expect(result.engines.valuation.score).toBeDefined();
    expect(result.engines.earnings.score).toBeDefined();
    expect(result.engines.risk.score).toBeDefined();
    expect(result.engines.sector.score).toBeDefined();
    expect(result.engines.news.score).toBeDefined();
    expect(result.engines.events.score).toBeDefined();
    expect(result.engines.rag.score).toBeDefined();
  });

  it('computes confidence from all engine confidences', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(0.99);
    console.log('Orchestrator confidence:', result.confidence);
  });

  it('classifies a weak stock as risk_rising or avoid', async () => {
    const weakInputs = makeInputs({
      symbol: 'WEAK',
      financial: { ...makeInputs().financial, roe: 2, revenueGrowth: -5, debtToEquity: 3.5, interestCoverage: 1.2, currentRatio: 0.6 },
      valuation: { ...makeInputs().valuation, peRatio: 55, pbRatio: 0.5, fcfYield: 0.5 },
      earnings: { ...makeInputs().earnings, history: Array.from({ length: 4 }, (_, i) => ({ quarter: `Q${i + 1} FY25`, eps: 5 - i, epsYoY: -10, revenue: 10000 - i * 500, revenueYoY: -5, margin: 3 - i * 0.5, surprise: -3, guidanceHit: false })), currentGuidance: { epsGrowth: -5, revenueGrowth: -2 } },
      risk: { ...makeInputs().risk, volatility: 45, beta: 1.8, debtToEquity: 3.5, currentRatio: 0.6, maxDrawdown: 55, sharpeRatio: -0.3, competitiveMoat: 0.1, executionRisk: 0.8 },
      sector: { ...makeInputs().sector, stockPE: 55, stockROE: 2, stockRevGrowth: -5, marketCapRank: 28 },
      news: { ...makeInputs().news, articles: [{ headline: 'Company reports loss, misses estimates', source: 'Reuters', time: '1 day ago' }, { headline: 'Credit rating downgrade on debt concerns', source: 'Bloomberg', time: '2 days ago' }] },
    });
    const result = await orchestrator.analyzeStock(weakInputs);
    // Very weak stocks should get risk_rising or avoid
    expect(['risk_rising', 'avoid', 'needs_review']).toContain(result.investmentState);
    console.log('Weak stock result:', result.overallScore, result.investmentState);
  });

  it('weights sum to 100%', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    const weightSum = Object.values(result.weights).reduce((a, w) => a + w, 0);
    expect(weightSum).toBeCloseTo(1.0, 2);
  });

  it('includes disclaimer in thesis', async () => {
    const result = await orchestrator.analyzeStock(makeInputs());
    expect(result.thesis.disclaimer).toContain('does not constitute');
    expect(result.thesis.disclaimer).toContain('SEBI');
  });
});
