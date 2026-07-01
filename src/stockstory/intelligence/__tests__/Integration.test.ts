/**
 * Tests: KnowledgeBase, LLMExplainer, IntelligenceCache, Orchestrator
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../rag/KnowledgeBase';
import { LLMExplainer, DeterministicExplainProvider, CachedExplainProvider } from '../llm/LLMExplainer';
import { IntelligenceCache } from '../persistence/IntelligenceCache';
import { LensoryOrchestrator } from '../orchestrator/LensoryOrchestrator';
import type { IntelligenceInput, StockIntelligenceReport } from '../types';

// ─── KnowledgeBase ────────────────────────────────────────────────

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  it('stores and retrieves documents', () => {
    kb.ingest({
      id: '1',
      content: 'TCS has strong operating margins above 25%',
      source: 'fundamentals',
      symbol: 'TCS',
      tags: ['margins', 'it'],
      timestamp: '2025-01-15',
    });

    expect(kb.count).toBe(1);
    const results = kb.query('TCS margins', 5);
    expect(results.length).toBe(1);
    expect(results[0].score).toBeGreaterThan(0);
  });

  it('finds documents by symbol', () => {
    kb.ingestMany([
      { id: '1', content: 'TCS info', source: 'test', symbol: 'TCS', tags: [], timestamp: '2025-01-15' },
      { id: '2', content: 'INFY info', source: 'test', symbol: 'INFY', tags: [], timestamp: '2025-01-15' },
    ]);
    expect(kb.findBySymbol('TCS')).toHaveLength(1);
    expect(kb.findBySymbol('INFY')).toHaveLength(1);
  });

  it('finds documents by sector', () => {
    kb.ingest({ id: '1', content: 'IT sector growth', source: 'sector', sector: 'Technology', tags: [], timestamp: '2025-01-15' });
    expect(kb.findBySector('Technology')).toHaveLength(1);
  });

  it('handles empty queries', () => {
    const results = kb.query('anything', 5);
    expect(results).toHaveLength(0);
  });

  it('clears documents', () => {
    kb.ingest({ id: '1', content: 'test', source: 'test', tags: [], timestamp: '2025-01-15' });
    kb.clear();
    expect(kb.count).toBe(0);
  });
});

// ─── LLMExplainer ─────────────────────────────────────────────────

describe('LLMExplainer', () => {
  const mockReport: StockIntelligenceReport = {
    symbol: 'TEST',
    exchange: 'NSE',
    generatedAt: '2025-01-15T00:00:00.000Z',
    compositeScore: { score: 72, label: 'good' },
    classification: 'healthy',
    confidence: { score: 80, label: 'good' },
    engines: {
      financial: { score: 75, qualityScore: 70, growthScore: 72, debtScore: 80, confidence: 0.8, dataCompleteness: 0.85, reasoning: 'Solid' },
      technical: { score: 68, trendScore: 70, momentumScore: 65, volatilityScore: 60, volumeScore: 55, patternRecognition: 'Uptrend', confidence: 0.7, reasoning: 'Bullish' },
      valuation: { score: 28, peScore: 55, pbScore: 65, evEbitdaScore: 60, fcfYieldScore: 58, dividendScore: 40, confidence: 0.75, reasoning: 'Fair' },
      risk: { score: 30, financialRisk: 25, valuationRisk: 20, volatilityRisk: 35, governanceRisk: 15, redFlagCount: 1, redFlags: ['Test flag'], confidence: 0.8, reasoning: 'Low risk' },
      sector: { score: 72, sectorStrength: 70, peerPercentile: 68, peerCount: 10, tailwindScore: 65, headwindScore: 20, confidence: 0.7, reasoning: 'Strong sector' },
      news: { score: 65, sentimentScore: 62, headlineCount: 8, avgSentiment: 0.3, positiveRatio: 0.5, negativeRatio: 0.2, controversy: 0.1, trending: true, confidence: 0.6, reasoning: 'Positive' },
      earnings: { score: 78, growthScore: 75, surpriseScore: 70, estimatesConfidence: 0.8, beatRate: 0.6, revenueTrend: 'growing', recentSurprise: 'beat', nextEarningsDays: 45, confidence: 0.75, reasoning: 'Strong earnings' },
      event: { score: 60, corporateActions: [], upcomingCatalysts: [{ type: 'earnings', expectedImpact: 'medium', expectedDate: '2025-04-15', description: 'Next earnings 45 days away' }], eventRisk: 25, confidence: 0.5, reasoning: 'Moderate' },
      rag: { score: 35, knowledgeCoverage: 0.3, relevantPatterns: ['High ROE'], competitorInsights: [], macroContext: ['Tech sector'], outcomeQuality: 0.3, confidence: 0.3, reasoning: 'Limited coverage' },
    },
    thesis: '',
    strengths: ['Financial (75/100)', 'Earnings (78/100)'],
    weaknesses: ['RAG (40/100)'],
    risks: [],
    opportunities: [],
    dataFreshness: 'recent',
    metadata: { computationTimeMs: 100, engineVersions: {}, dataCompleteness: 0.8 },
  };

  it('generates explanation with deterministic provider', async () => {
    const explainer = new LLMExplainer(new DeterministicExplainProvider());
    const result = await explainer.explain(mockReport);
    expect(result.thesis).toBeTruthy();
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.provider).toBe('deterministic');
  });

  it('caches results', async () => {
    const inner = new DeterministicExplainProvider();
    const cached = new CachedExplainProvider(inner, 60);
    const explainer = new LLMExplainer(cached);

    const r1 = await explainer.explain(mockReport);
    const r2 = await explainer.explain(mockReport);
    expect(r1.thesis).toBe(r2.thesis);
    expect(cached.name).toContain('cached');
  });
});

// ─── IntelligenceCache ────────────────────────────────────────────

describe('IntelligenceCache', () => {
  let cache: IntelligenceCache;
  let report: StockIntelligenceReport;

  beforeEach(() => {
    cache = new IntelligenceCache(60);
    report = {
      symbol: 'TEST',
      exchange: 'NSE',
      generatedAt: '2025-01-15T00:00:00.000Z',
      compositeScore: { score: 70, label: 'good' },
      classification: 'healthy',
      confidence: { score: 80, label: 'good' },
      engines: {} as any,
      thesis: '', strengths: [], weaknesses: [], risks: [], opportunities: [],
      dataFreshness: 'recent',
      metadata: { computationTimeMs: 0, engineVersions: {}, dataCompleteness: 0 },
    };
  });

  it('stores and retrieves reports', () => {
    cache.set(report);
    const retrieved = cache.get('TEST');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.symbol).toBe('TEST');
  });

  it('returns null for missing keys', () => {
    expect(cache.get('MISSING')).toBeNull();
  });

  it('invalidates specific entries', () => {
    cache.set(report);
    cache.invalidate('TEST');
    expect(cache.get('TEST')).toBeNull();
  });

  it('evicts expired entries', () => {
    cache.set(report, 0); // zero TTL = expired immediately
    const evicted = cache.evictExpired();
    expect(evicted).toBe(1);
  });

  it('clears all entries', () => {
    cache.set(report);
    cache.clear();
    expect(cache.size).toBe(0);
  });
});

// ─── Orchestrator ─────────────────────────────────────────────────

describe('LensoryOrchestrator', () => {
  const input: IntelligenceInput = {
    symbol: 'TEST',
    exchange: 'NSE_EQ',
    tradeDate: '2025-01-15',
    financials: {
      peRatio: 15, pbRatio: 2.5, eps: 50, dividendYield: 1.5,
      beta: 1.1, marketCap: 50000, freeFloat: 45,
      fcfYield: 3.5, evEbitda: 10, roa: 6, roe: 14, roic: 12,
      debtToEquity: 40, currentRatio: 1.8,
      revenueGrowth: 12, profitGrowth: 10, epsGrowth: 15, fcfGrowth: 8,
      grossMargin: 40, operatingMargin: 16, netMargin: 10,
      interestCoverage: 4.5, assetTurnover: 1.2,
      receivablesTurnover: 8, inventoryTurnover: 6,
      operatingCashFlow: 5000, freeCashFlow: 3000, capex: 2000,
    },
    technicals: {
      rsi: 55, macd: 1.5, macdSignal: 1, macdHistogram: 0.5,
      adx: 25, atr: 12, bollingerWidth: 8, bollingerPosition: 0.5,
      momentum1m: 3, momentum3m: 8, momentum6m: 12, momentum12m: 18,
      volatility: 28, sma50: 145, sma200: 138,
      sma50Distance: 2, sma200Distance: 5,
      volume: 1800000, avgVolume: 1500000, volumeRatio: 1.2,
      relativeStrength: 52, trendStrength: 55, avgTrueRange: 10,
    },
    earnings: {
      epsTtm: 50, epsGrowthQoq: 8, revenueGrowthQoq: 6,
      surprisePercent: 5, beatMiss: 'beat', peTtm: 15, forwardPe: 13,
      pegRatio: 1.2, estimatesAvailable: true,
      nextEarningsDate: '2025-04-15', recentEarningsDate: '2025-01-10',
      fiscalQuarter: 'Q3', fiscalYear: 2025,
    },
    sentiment: {
      overallScore: 0.3, recentHeadlines: 12,
      avgRecentSentiment: 0.25, mentionVolume: 100,
      positiveRatio: 0.5, negativeRatio: 0.2, neutralRatio: 0.3,
      trending: true, controversyScore: 0.1,
    },
    sector: {
      name: 'Technology', sectorStrength: 65,
      sectorMomentum: 'accelerating', sectorPe: 22,
      sectorAvgGrowth: 10, sectorAvgMargin: 18,
    },
    risks: {
      auditorChange: false, relatedPartyTransactions: false,
      pledgedShares: 15, promoterHolding: 55, institutionalHolding: 25,
      outstandingWarrants: false, esopDilution: 2,
      litigationRisk: 0.1, governanceScore: 70,
    },
  };

  it('produces a complete report', async () => {
    const orchestrator = new LensoryOrchestrator({ enableRAG: false });
    const report = await orchestrator.analyze(input);

    expect(report.symbol).toBe('TEST');
    expect(report.compositeScore.score).toBeGreaterThanOrEqual(0);
    expect(report.compositeScore.score).toBeLessThanOrEqual(100);
    expect(report.classification).toBeDefined();
    expect(report.thesis).toBeTruthy();
    expect(report.strengths.length).toBeGreaterThan(0);
    expect(report.metadata.computationTimeMs).toBeGreaterThan(0);
  });

  it('includes all engine outputs', async () => {
    const orchestrator = new LensoryOrchestrator();
    const report = await orchestrator.analyze(input);

    const engines = report.engines;
    expect(engines.financial.score).toBeGreaterThanOrEqual(0);
    expect(engines.technical.score).toBeGreaterThanOrEqual(0);
    expect(engines.valuation.score).toBeGreaterThanOrEqual(0);
    expect(engines.risk.score).toBeGreaterThanOrEqual(0);
    expect(engines.sector.score).toBeGreaterThanOrEqual(0);
    expect(engines.news.score).toBeGreaterThanOrEqual(0);
    expect(engines.earnings.score).toBeGreaterThanOrEqual(0);
    expect(engines.event.score).toBeGreaterThanOrEqual(0);
    expect(engines.rag.score).toBeGreaterThanOrEqual(0);
  });

  it('assesses data freshness correctly', async () => {
    const orchestrator = new LensoryOrchestrator();
    const report = await orchestrator.analyze(input);
    expect(['live', 'recent', 'stale', 'unavailable']).toContain(report.dataFreshness);
  });
});
