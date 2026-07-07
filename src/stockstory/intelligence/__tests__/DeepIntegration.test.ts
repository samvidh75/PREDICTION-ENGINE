/**
 * Deep Intelligence Integration Test
 *
 * Tests all 20 engines (10 base + 10 new) via the DeepLensoryOrchestrator.
 * Uses the same realistic RELIANCE-like test data from Integration.test.ts.
 */

import { describe, it, expect } from 'vitest';
import { DeepLensoryOrchestrator } from '../orchestrator/DeepLensoryOrchestrator';
import type { IntelligenceInput } from '../types';

// Also import individual engines for direct unit tests
import { buildFromInput } from '../company/CompanyProfileFactory';
import { sectorProfileBuilder } from '../sector/SectorProfileBuilder';
import { peerGraphBuilder } from '../peers/PeerGraphBuilder';
import { factorAttributionEngine } from '../attribution/FactorAttributionEngine';
import { thesisLifecycleEngine } from '../thesis/ThesisLifecycleEngine';
import { moatEngine } from '../moat/MoatEngine';
import { governanceRiskEngine } from '../governance/GovernanceRiskEngine';
import { ownershipEngine } from '../ownership/OwnershipEngine';
import { catalystEngine } from '../catalysts/CatalystEngine';
import { earningsQualityEngine } from '../earningsQuality/EarningsQualityEngine';
import { valuationRegimeEngine } from '../valuationRegime/ValuationRegimeEngine';
import { technicalRegimeEngine } from '../technicalRegime/TechnicalRegimeEngine';
import { riskRadarEngine } from '../riskRadar/RiskRadarEngine';
import { opportunityClassifierEngine } from '../opportunity/OpportunityClassifierEngine';
import { nlScannerEngine } from '../scanner/NLScannerEngine';
import { watchlistEngine } from '../watchlist/WatchlistEngine';
import { portfolioEngine } from '../portfolio/PortfolioEngine';
import { memoryEngine } from '../memory/MemoryEngine';
import { explainabilityEngine } from '../explainability/ExplainabilityEngine';

const testInput: IntelligenceInput = {
  symbol: 'RELIANCE',
  exchange: 'PSE_EQ',
  tradeDate: new Date().toISOString().slice(0, 10),
  financials: {
    peRatio: 25, pbRatio: 2.5, eps: 120, dividendYield: 0.35,
    beta: 1.1, marketCap: 1800000, freeFloat: 55,
    fcfYield: 2.5, evEbitda: 18, roa: 7, roe: 12, roic: 10,
    debtToEquity: 65, currentRatio: 1.3,
    revenueGrowth: 8, profitGrowth: 5, epsGrowth: 6, fcfGrowth: 3,
    grossMargin: 35, operatingMargin: 18, netMargin: 9,
    interestCoverage: 3.2, assetTurnover: 0.9,
    receivablesTurnover: 7, inventoryTurnover: 5,
    operatingCashFlow: 120000, freeCashFlow: 45000, capex: 75000,
  },
  technicals: {
    rsi: 52, macd: 2.5, macdSignal: 1.8, macdHistogram: 0.7,
    adx: 28, atr: 15, bollingerWidth: 10, bollingerPosition: 0.6,
    momentum1m: 2, momentum3m: 6, momentum6m: 10, momentum12m: 15,
    volatility: 32, sma50: 2600, sma200: 2450,
    sma50Distance: 3, sma200Distance: 8,
    volume: 8500000, avgVolume: 7800000, volumeRatio: 1.09,
    relativeStrength: 48, trendStrength: 55, avgTrueRange: 45,
  },
  earnings: {
    epsTtm: 120, epsGrowthQoq: 3, revenueGrowthQoq: 5,
    surprisePercent: 3.5, beatMiss: 'beat', peTtm: 25, forwardPe: 22,
    pegRatio: 2.1, estimatesAvailable: true,
    nextEarningsDate: '2025-07-18', recentEarningsDate: '2025-04-15',
    fiscalQuarter: 'Q4', fiscalYear: 2025,
  },
  sentiment: {
    overallScore: 0.25, recentHeadlines: 25,
    avgRecentSentiment: 0.2, mentionVolume: 120,
    positiveRatio: 0.4, negativeRatio: 0.25, neutralRatio: 0.35,
    trending: true, controversyScore: 0.2,
  },
  sector: {
    name: 'Oil & Gas',
    sectorStrength: 60,
    sectorMomentum: 'stable',
    sectorPe: 20,
    sectorAvgGrowth: 8,
    sectorAvgMargin: 15,
  },
  risks: {
    auditorChange: false, relatedPartyTransactions: true,
    pledgedShares: 1.5, promoterHolding: 50.3, institutionalHolding: 34,
    outstandingWarrants: false, esopDilution: 1,
    litigationRisk: 0.15, governanceScore: 72,
  },
};

describe('DeepLensoryOrchestrator — 20-Engine Pipeline', () => {
  const deepOrch = new DeepLensoryOrchestrator();

  it('produces a complete deep intelligence report', async () => {
    const report = await deepOrch.analyze(testInput);

    // Base fields
    expect(report.symbol).toBe('RELIANCE');
    expect(report.compositeScore.score).toBeGreaterThanOrEqual(0);
    expect(report.compositeScore.score).toBeLessThanOrEqual(100);
    expect(report.classification).toBeDefined();
    expect(report.thesis).toBeTruthy();

    // Deep subsystems populated
    expect(report.deep).toBeDefined();
    expect(report.deep.companyProfile).not.toBeNull();
    expect(report.deep.sectorProfile).not.toBeNull();
    expect(report.deep.peerGraph).toBeDefined();
    expect(report.deep.factorAttribution).not.toBeNull();
    expect(report.deep.thesisLifecycle).not.toBeNull();
    expect(report.deep.moat).not.toBeNull();
    expect(report.deep.governance).not.toBeNull();
    expect(report.deep.ownership).not.toBeNull();
    expect(report.deep.catalysts).not.toBeNull();
    expect(report.deep.earningsQuality).not.toBeNull();
    expect(report.deep.valuationRegime).not.toBeNull();
    expect(report.deep.technicalRegime).not.toBeNull();
    expect(report.deep.riskRadar).not.toBeNull();
    expect(report.deep.opportunity).not.toBeNull();

    // Deep composite
    expect(report.deepComposite.score).toBeGreaterThanOrEqual(0);
    expect(report.deepComposite.score).toBeLessThanOrEqual(100);
    expect(report.deepComposite.label).toBeDefined();
    expect(Object.keys(report.deepComposite.dimensions).length).toBeGreaterThan(0);

    // Metadata
    expect(report.metadata.computationTimeMs).toBeGreaterThan(0);
    expect(report.metadata.engineVersions).toBeDefined();
    console.log(`\n✅ Deep composite: ${report.deepComposite.score}/100 (${report.deepComposite.label})`);
    console.log(`✅ Company profile aggregate: ${report.deep.companyProfile?.aggregateScore}/100`);
    console.log(`✅ Base composite: ${report.compositeScore.score}/100`);
    console.log(`✅ Computation time: ${report.metadata.computationTimeMs}ms`);
    console.log(`✅ Total engine versions: ${Object.keys(report.metadata.engineVersions).length}`);
  });
});

describe('Individual Engine Unit Tests', () => {
  it('CompanyProfileFactory builds a profile', () => {
    const profile = buildFromInput(testInput);
    expect(profile).not.toBeNull();
    expect(profile.symbol).toBe('RELIANCE');
    expect(profile.aggregate.overall).toBeGreaterThanOrEqual(0);
    expect(profile.identity).toBeDefined();
  });

  it('SectorProfileBuilder builds a sector profile', () => {
    const profile = sectorProfileBuilder.build(testInput);
    expect(profile.sectorName).toBe('Oil & Gas');
    expect(profile.health.healthScore).toBeGreaterThanOrEqual(0);
  });

  it('PeerGraphBuilder builds a peer graph', () => {
    const focus = buildFromInput(testInput);
    const graph = peerGraphBuilder.build(focus, []);
    expect(graph.focusCompany).toBe('RELIANCE');
    expect(graph.peers).toBeDefined();
  });

  it('FactorAttributionEngine decomposes factors', () => {
    const report = factorAttributionEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.factors).toBeDefined();
    expect(report.factors.length).toBeGreaterThan(0);
  });

  it('ThesisLifecycleEngine manages thesis', () => {
    const profile = buildFromInput(testInput);
    const report = thesisLifecycleEngine.build(profile, testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.state).toBeDefined();
    expect(report.conviction).toBeDefined();
  });

  it('MoatEngine assesses competitive advantage', () => {
    const report = moatEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.moatScore).toBeGreaterThanOrEqual(0);
    expect(report.moatWidth).toBeDefined();
  });

  it('GovernanceRiskEngine evaluates governance', () => {
    const report = governanceRiskEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.governanceScore).toBeGreaterThanOrEqual(0);
  });

  it('OwnershipEngine analyses ownership', () => {
    const report = ownershipEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.ownership.promoterHolding).toBe(50.3);
    expect(report.qualityScore).toBeGreaterThanOrEqual(0);
  });

  it('CatalystEngine detects catalysts', () => {
    const report = catalystEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.catalysts.length).toBeGreaterThan(0);
    expect(report.thesisImpact).toBeDefined();
  });

  it('EarningsQualityEngine assesses earnings', () => {
    const report = earningsQualityEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.qualityScore).toBeGreaterThanOrEqual(0);
  });

  it('ValuationRegimeEngine classifies regime', () => {
    const report = valuationRegimeEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.regime).toBeDefined();
  });

  it('TechnicalRegimeEngine classifies regime', () => {
    const report = technicalRegimeEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.regime).toBeDefined();
  });

  it('RiskRadarEngine builds radar', () => {
    const report = riskRadarEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.dimensions.length).toBeGreaterThan(0);
    expect(report.overview).toBeDefined();
  });

  it('OpportunityClassifierEngine classifies opportunity', () => {
    const report = opportunityClassifierEngine.analyze(testInput);
    expect(report.symbol).toBe('RELIANCE');
    expect(report.primaryType).toBeDefined();
  });

  it('NLScannerEngine scans with queries', () => {
    const result = nlScannerEngine.scan(testInput, 'companies with pe above 20');
    expect(result.results.length).toBe(1);
    expect(result.parsedFilters.length).toBeGreaterThan(0);
  });

  it('WatchlistEngine evaluates entries', () => {
    const entry = {
      symbol: 'RELIANCE',
      addedAt: new Date().toISOString(),
      thesisSummary: 'Test thesis',
      alertRules: watchlistEngine.createDefaultRules(),
      lastSignalCheck: null,
      activeAlerts: [],
    };
    const alerts = watchlistEngine.evaluateEntry(entry, testInput);
    expect(Array.isArray(alerts)).toBe(true);
  });

  it('PortfolioEngine builds reports', () => {
    const entry = {
      symbol: 'RELIANCE',
      thesisId: 'th_1',
      thesisState: 'confirmed' as const,
      conviction: 'watch' as const,
      lastUpdated: new Date().toISOString(),
      keyObservations: ['Strong sector position', 'Healthy margins'],
      activeConcerns: ['High capex'],
      dataPointsCollected: 12,
    };
    const report = portfolioEngine.buildReport([entry]);
    expect(report.activeThesisCount).toBe(1);
    expect(report.entries.length).toBe(1);
  });

  it('MemoryEngine records and queries', () => {
    memoryEngine.clearAll();
    memoryEngine.recordEngineRun('RELIANCE', 'MoatEngine', { score: 65 });
    memoryEngine.recordSignal('RELIANCE', 'sig_wide_moat', { strength: 'strong' });
    const results = memoryEngine.getForSymbol('RELIANCE');
    expect(results.length).toBe(2);

    const report = memoryEngine.buildReport('RELIANCE');
    expect(report.entryCount).toBe(2);
  });

  it('ExplainabilityEngine generates explanations', () => {
    const explanation = explainabilityEngine.explain({
      symbol: 'RELIANCE',
      topic: 'composite_score',
      level: 'L2',
      data: { compositeScore: 65, classification: 'healthy' },
    });
    expect(explanation.topic).toBe('composite_score');
    expect(explanation.body).toBeTruthy();
    expect(explanation.keyPoints.length).toBeGreaterThan(0);
  });
});
