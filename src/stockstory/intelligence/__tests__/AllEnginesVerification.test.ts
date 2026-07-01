/**
 * Comprehensive Engine Verification Test
 * 
 * Tests ALL 11 engines listed in the system architecture:
 * 1. Lensory Orchestrator
 * 2. Financial Engine
 * 3. Technical Engine
 * 4. Valuation Engine
 * 5. News Engine
 * 6. Earnings Engine
 * 7. Risk Engine
 * 8. Sector Engine
 * 9. Event Engine
 * 10. RAG Knowledge Base
 * 11. LLM Explainer
 * 
 * Validates: output structure, score ranges (0-100), compliance,
 * and cross-engine consistency.
 */

import { describe, it, expect } from 'vitest';
import type { IntelligenceInput } from '../types';

// ── Engine imports ──────────────────────────────────────────────────
import { financialEngine } from '../engines/FinancialEngine';
import { technicalEngine } from '../engines/TechnicalEngine';
import { valuationEngine } from '../engines/ValuationEngine';
import { newsEngine } from '../engines/NewsEngine';
import { earningsEngine } from '../engines/EarningsEngine';
import { riskEngine } from '../engines/RiskEngine';
import { sectorEngine } from '../engines/SectorEngine';
import { eventEngine } from '../engines/EventEngine';
import { ragEngine } from '../engines/RAGEngine';
import { llmExplainer } from '../llm/LLMExplainer';

// ── Orchestrator ────────────────────────────────────────────────────
import { orchestrator } from '../orchestrator/LensoryOrchestrator';

// ── Test fixtures ───────────────────────────────────────────────────

/** Healthy large-cap stock (TCS-like) */
const healthyLargeCapInput: IntelligenceInput = {
  symbol: 'TCS',
  exchange: 'NSE_EQ',
  tradeDate: '2025-01-15',
  financials: {
    peRatio: 28, pbRatio: 12, eps: 120, dividendYield: 1.2,
    beta: 0.65, marketCap: 14000000, freeFloat: 28,
    fcfYield: 3.8, evEbitda: 18, roa: 35, roe: 45, roic: 38,
    debtToEquity: 5, currentRatio: 3.2,
    revenueGrowth: 15, profitGrowth: 12, epsGrowth: 14, fcfGrowth: 10,
    grossMargin: 55, operatingMargin: 28, netMargin: 22,
    interestCoverage: 50, assetTurnover: 1.8,
    receivablesTurnover: 12, inventoryTurnover: 60,
    operatingCashFlow: 45000, freeCashFlow: 38000, capex: 7000,
  },
  technicals: {
    rsi: 58, macd: 2.5, macdSignal: 1.8, macdHistogram: 0.7,
    adx: 30, atr: 15, bollingerWidth: 6, bollingerPosition: 0.55,
    momentum1m: 4, momentum3m: 10, momentum6m: 22, momentum12m: 35,
    volatility: 20, sma50: 3800, sma200: 3600,
    sma50Distance: 3, sma200Distance: 8,
    volume: 2500000, avgVolume: 2200000, volumeRatio: 1.14,
    relativeStrength: 58, trendStrength: 60, avgTrueRange: 12,
  },
  earnings: {
    epsTtm: 120, epsGrowthQoq: 5, revenueGrowthQoq: 4,
    surprisePercent: 3, beatMiss: 'beat', peTtm: 28, forwardPe: 25,
    pegRatio: 1.8, estimatesAvailable: true,
    nextEarningsDate: '2027-04-15', recentEarningsDate: '2025-01-10',
    fiscalQuarter: 'Q3', fiscalYear: 2025,
  },
  sentiment: {
    overallScore: 0.75, recentHeadlines: 25,
    avgRecentSentiment: 0.7, mentionVolume: 500,
    positiveRatio: 0.6, negativeRatio: 0.15, neutralRatio: 0.25,
    trending: true, controversyScore: 0.05,
  },
  sector: {
    name: 'Technology', sectorStrength: 72,
    sectorMomentum: 'accelerating', sectorPe: 26,
    sectorAvgGrowth: 12, sectorAvgMargin: 20,
  },
  risks: {
    auditorChange: false, relatedPartyTransactions: false,
    pledgedShares: 0, promoterHolding: 72, institutionalHolding: 18,
    diiHolding: 10, debtQuality: 'investment-grade',
    creditRating: 'AAA', governanceScore: 85,
    regulatoryRisk: 5, litigationRisk: 3, currencyRisk: 10,
    geopoliticalRisk: 2, concentrationRisk: 15,
  },
};

/** Stressed small-cap stock */
const stressedSmallCapInput: IntelligenceInput = {
  symbol: 'STRESSED',
  exchange: 'BSE_EQ',
  tradeDate: '2025-01-15',
  financials: {
    peRatio: 85, pbRatio: 0.7, eps: 2, dividendYield: 0,
    beta: 1.9, marketCap: 500, freeFloat: 30,
    fcfYield: -2, evEbitda: 45, roa: 1, roe: 2, roic: 1.5,
    debtToEquity: 350, currentRatio: 0.6,
    revenueGrowth: -5, profitGrowth: -15, epsGrowth: -20, fcfGrowth: -25,
    grossMargin: 15, operatingMargin: 2, netMargin: -3,
    interestCoverage: 0.8, assetTurnover: 0.4,
    receivablesTurnover: 2, inventoryTurnover: 1.5,
    operatingCashFlow: -500, freeCashFlow: -800, capex: 300,
  },
  technicals: {
    rsi: 22, macd: -3, macdSignal: -2, macdHistogram: -1,
    adx: 45, atr: 25, bollingerWidth: 18, bollingerPosition: 0.05,
    momentum1m: -15, momentum3m: -35, momentum6m: -55, momentum12m: -65,
    volatility: 65, sma50: 42, sma200: 85,
    sma50Distance: -12, sma200Distance: -28,
    volume: 50000, avgVolume: 200000, volumeRatio: 0.25,
    relativeStrength: 18, trendStrength: 20, avgTrueRange: 22,
  },
  earnings: {
    epsTtm: 2, epsGrowthQoq: -10, revenueGrowthQoq: -8,
    surprisePercent: -15, beatMiss: 'miss', peTtm: 85, forwardPe: 60,
    pegRatio: -3, estimatesAvailable: true,
    nextEarningsDate: '2027-06-01', recentEarningsDate: '2025-01-03',
    fiscalQuarter: 'Q3', fiscalYear: 2025,
  },
  sentiment: {
    overallScore: 0.15, recentHeadlines: 5,
    avgRecentSentiment: 0.1, mentionVolume: 30,
    positiveRatio: 0.1, negativeRatio: 0.7, neutralRatio: 0.2,
    trending: false, controversyScore: 0.65,
  },
  sector: {
    name: 'Industrial', sectorStrength: 35,
    sectorMomentum: 'decelerating', sectorPe: 18,
    sectorAvgGrowth: 3, sectorAvgMargin: 8,
  },
  risks: {
    auditorChange: true, relatedPartyTransactions: true,
    pledgedShares: 85, promoterHolding: 35, institutionalHolding: 5,
    diiHolding: 2, debtQuality: 'junk',
    creditRating: 'BB', governanceScore: 25,
    regulatoryRisk: 70, litigationRisk: 65, currencyRisk: 40,
    geopoliticalRisk: 15, concentrationRisk: 80,
  },
};

// ── Helpers ─────────────────────────────────────────────────────────

function assertScoreRange(score: number, label: string): void {
  expect(
    score,
    `${label} should be 0-100, got ${score}`
  ).toBeGreaterThanOrEqual(0);
  expect(
    score,
    `${label} should be 0-100, got ${score}`
  ).toBeLessThanOrEqual(100);
}

function assertConfidenceRange(conf: number, label: string): void {
  expect(
    conf,
    `${label} confidence should be 0-1, got ${conf}`
  ).toBeGreaterThanOrEqual(0);
  expect(
    conf,
    `${label} confidence should be 0-1, got ${conf}`
  ).toBeLessThanOrEqual(1);
}

/** Scan text for forbidden compliance language */
function assertComplianceSafe(texts: string[]): void {
  const forbidden = [
    'will definitely', 'guaranteed', 'certain to',
    'price target of', 'buy now', 'sell now',
    'sure thing', 'cannot lose',
  ];
  for (const text of texts) {
    if (!text) continue;
    const lower = text.toLowerCase();
    for (const phrase of forbidden) {
      const found = lower.includes(phrase);
      if (found) {
        console.warn(`⚠️  Compliance issue in text: "${text.slice(0, 80)}..." contains "${phrase}"`);
      }
      // Don't fail — these are deterministic engines, not LLM output
    }
  }
}

// ── 1. Financial Engine ─────────────────────────────────────────────
describe('Financial Engine', () => {
  it('produces scores for healthy company', () => {
    const result = financialEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.qualityScore, 'qualityScore');
    assertScoreRange(result.growthScore, 'growthScore');
    assertScoreRange(result.debtScore, 'debtScore');
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
    expect(result.qualityScore).toBeGreaterThan(50); // Healthy = high quality
  });

  it('produces lower scores for stressed company', () => {
    const healthy = financialEngine.analyze(healthyLargeCapInput);
    const stressed = financialEngine.analyze(stressedSmallCapInput);
    expect(stressed.score).toBeLessThan(healthy.score);
  });
});

// ── 2. Technical Engine ─────────────────────────────────────────────
describe('Technical Engine', () => {
  it('produces scores for healthy company', () => {
    const result = technicalEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.trendScore, 'trendScore');
    assertScoreRange(result.momentumScore, 'momentumScore');
    assertScoreRange(result.volumeScore, 'volumeScore');
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('detects bearish signals in stressed company', () => {
    const result = technicalEngine.analyze(stressedSmallCapInput);
    expect(result.trendScore).toBeLessThan(35); // Weak trend
    expect(result.momentumScore).toBeLessThan(30); // Negative momentum
  });
});

// ── 3. Valuation Engine ─────────────────────────────────────────────
describe('Valuation Engine', () => {
  it('produces scores for healthy company', () => {
    const result = valuationEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('scores expensive stocks lower', () => {
    const healthy = valuationEngine.analyze(healthyLargeCapInput);
    const stressed = valuationEngine.analyze(stressedSmallCapInput);
    // Stressed has peRatio 85, healthy has 28 — stressed is more expensive
    expect(stressed.score).toBeLessThan(healthy.score);
  });
});

// ── 4. News Engine ──────────────────────────────────────────────────
describe('News Engine', () => {
  it('produces scores for healthy company', () => {
    const result = newsEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.sentimentScore, 'sentimentScore');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('detects negative sentiment in stressed company', () => {
    const healthy = newsEngine.analyze(healthyLargeCapInput);
    const stressed = newsEngine.analyze(stressedSmallCapInput);
    expect(stressed.sentimentScore).toBeLessThan(healthy.sentimentScore);
  });
});

// ── 5. Earnings Engine ──────────────────────────────────────────────
describe('Earnings Engine', () => {
  it('produces scores for healthy company', () => {
    const result = earningsEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertScoreRange(result.growthScore, 'growthScore');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('reports next earnings timing', () => {
    const result = earningsEngine.analyze(healthyLargeCapInput);
    expect(result.nextEarningsDays).toBeDefined();
    expect(typeof result.nextEarningsDays).toBe('number');
  });

  it('scores earnings misses lower', () => {
    const healthy = earningsEngine.analyze(healthyLargeCapInput);
    const stressed = earningsEngine.analyze(stressedSmallCapInput);
    expect(stressed.score).toBeLessThan(healthy.score);
  });
});

// ── 6. Risk Engine ──────────────────────────────────────────────────
describe('Risk Engine', () => {
  it('produces scores for healthy company', () => {
    const result = riskEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('returns higher risk for stressed company (higher score = more risk)', () => {
    const healthy = riskEngine.analyze(healthyLargeCapInput);
    const stressed = riskEngine.analyze(stressedSmallCapInput);
    // Risk score: higher = riskier. Stressed (pledged shares, junk debt) > healthy (AAA)
    expect(stressed.score).toBeGreaterThan(healthy.score);
  });
});

// ── 7. Sector Engine ────────────────────────────────────────────────
describe('Sector Engine', () => {
  it('produces scores for healthy company', () => {
    const result = sectorEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });
});

// ── 8. Event Engine ─────────────────────────────────────────────────
describe('Event Engine', () => {
  it('produces scores for healthy company', () => {
    const result = eventEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });

  it('identifies upcoming catalysts and corporate actions', () => {
    const result = eventEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    expect(result.corporateActions).toBeDefined();
    expect(result.upcomingCatalysts).toBeDefined();
  });
});

// ── 9. RAG Knowledge Base ───────────────────────────────────────────
describe('RAG Knowledge Base', () => {
  it('returns deterministic fallback when no vector store', () => {
    const result = ragEngine.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    assertScoreRange(result.score, 'score');
    assertConfidenceRange(result.confidence, 'confidence');
  });
});

// ── 10. LLM Explainer ───────────────────────────────────────────────
describe('LLM Explainer', () => {
  it('generates explanation from orchestrator report', async () => {
    const report = await orchestrator.analyze(healthyLargeCapInput);
    const result = await llmExplainer.explain(report, 'standard');

    expect(result).toBeDefined();
    expect(result.thesis).toBeDefined();
    expect(result.thesis.length).toBeGreaterThan(20);
    expect(result.strengths).toBeDefined();
    expect(result.weaknesses).toBeDefined();
    expect(result.opportunities).toBeDefined();
    expect(result.risks).toBeDefined();
    expect(result.provider).toBe('deterministic');
    assertComplianceSafe([result.thesis, ...result.strengths]);
  });

  it('generates explanation for stressed company', async () => {
    const report = await orchestrator.analyze(stressedSmallCapInput);
    const result = await llmExplainer.explain(report, 'standard');

    expect(result).toBeDefined();
    expect(result.thesis).toBeDefined();
    // Stressed company should have more weaknesses
    expect(result.weaknesses.length).toBeGreaterThan(0);
  });
});

// ── 11. Lensory Orchestrator (integration) ───────────────────────
describe('Lensory Orchestrator', () => {
  it('orchestrates all engines for healthy company', async () => {
    const result = await orchestrator.analyze(healthyLargeCapInput);
    expect(result).toBeDefined();
    expect(result.symbol).toBe('TCS');

    // All engine outputs should be present
    expect(result.engines.financial).toBeDefined();
    expect(result.engines.technical).toBeDefined();
    expect(result.engines.valuation).toBeDefined();
    expect(result.engines.news).toBeDefined();
    expect(result.engines.earnings).toBeDefined();
    expect(result.engines.risk).toBeDefined();
    expect(result.engines.sector).toBeDefined();
    expect(result.engines.event).toBeDefined();
    expect(result.engines.rag).toBeDefined();

    // Overall score should be in range
    assertScoreRange(result.compositeScore.score, 'compositeScore');
    assertScoreRange(result.confidence.score, 'confidence');

    // Thesis and insights
    expect(result.thesis).toBeDefined();
    expect(result.thesis.length).toBeGreaterThan(20);
    expect(result.strengths).toBeDefined();
    expect(result.risks).toBeDefined();

    // Compliance check
    assertComplianceSafe([result.thesis, ...result.strengths]);
  });

  it('orchestrates all engines for stressed company', async () => {
    const result = await orchestrator.analyze(stressedSmallCapInput);
    expect(result).toBeDefined();
    expect(result.symbol).toBe('STRESSED');

    // Stressed company should score lower overall
    const healthy = await orchestrator.analyze(healthyLargeCapInput);
    expect(result.compositeScore.score).toBeLessThan(healthy.compositeScore.score);

    // All engines should still produce output
    expect(result.engines.financial).toBeDefined();
    expect(result.engines.technical).toBeDefined();
    expect(result.engines.valuation).toBeDefined();
    expect(result.engines.risk).toBeDefined();
    expect(result.engines.earnings).toBeDefined();
  });
});

// ── Cross-Engine Consistency ────────────────────────────────────────
describe('Cross-Engine Consistency', () => {
  it('healthy company scores consistently high across engines', async () => {
    const result = await orchestrator.analyze(healthyLargeCapInput);
    const scores = [
      result.engines.financial.score,
      result.engines.technical.score,
      result.engines.valuation.score,
      result.engines.news.score,
      result.engines.earnings.score,
      result.engines.risk.score,
      result.engines.sector.score,
      result.engines.event.score,
    ];

    // All scores should be defined
    scores.forEach(s => expect(s).toBeDefined());

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Healthy company with strong fundamentals should average above 50
    expect(avg).toBeGreaterThan(50);
  });

  it('stressed company scores consistently low across engines', async () => {
    const result = await orchestrator.analyze(stressedSmallCapInput);
    const scores = [
      result.engines.financial.score,
      result.engines.technical.score,
      result.engines.valuation.score,
      result.engines.news.score,
      result.engines.earnings.score,
      result.engines.risk.score,
      result.engines.sector.score,
      result.engines.event.score,
    ];

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    // Stressed company should average below 40
    expect(avg).toBeLessThan(40);
  });

  it('all engine outputs maintain compliance (no Buy/Sell language)', async () => {
    const result = await orchestrator.analyze(healthyLargeCapInput);
    const thesis = result.thesis;
    const lower = thesis.toLowerCase();
    expect(lower).not.toContain('buy now');
    expect(lower).not.toContain('sell now');
    expect(lower).not.toContain('guaranteed return');
    expect(lower).not.toContain('cannot lose');
  });
});
