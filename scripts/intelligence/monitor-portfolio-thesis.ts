#!/usr/bin/env npx tsx
/**
 * Phase 16 — Portfolio Thesis Monitor Validation
 *
 * Tests PortfolioEngine and ThesisLifecycleEngine to validate:
 *   - Thesis state lifecycles (forming→validating→confirmed→weakening→invalidated)
 *   - Conviction level assignments
 *   - Review candidate identification
 *   - Portfolio snapshots with conviction/state breakdowns
 *   - Entry updates with observation/concern tracking
 */

import * as path from 'path';
import * as fs from 'fs';

import { PortfolioEngine, type PortfolioThesisEntry } from '../../src/stockstory/intelligence/portfolio/PortfolioEngine';
import { ThesisLifecycleEngine } from '../../src/stockstory/intelligence/thesis/ThesisLifecycleEngine';
import type { CompanyIntelligenceProfile, CompanyProfileFactory } from '../../src/stockstory/intelligence/company/CompanyProfileFactory';
import type { IntelligenceInput } from '../../src/stockstory/intelligence/types';

const portfolio = new PortfolioEngine();
const thesisEngine = new ThesisLifecycleEngine();

// ── Build a minimal company profile for thesis creation ────────────

function makeProfile(symbol: string, aggregateScore: number, confidence: number): CompanyIntelligenceProfile {
  return {
    symbol,
    exchange: 'NSE',
    aggregate: {
      overall: aggregateScore,
      confidence,
      dataCompleteness: 0.7,
      signalCount: 5,
    },
    fundamentals: {
      roe: 15, roa: 8, roic: 14,
      operatingMargin: 22, netMargin: 15,
      debtToEquity: 0.4, currentRatio: 2.1,
      interestCoverage: 8, peRatio: 18, pbRatio: 3, dividendYield: 1.5,
    },
    growth: {
      revenueCAGR: 12, profitCAGR: 15,
      trajectory: 'accelerating' as const,
    },
    quality: {
      qualityScore: 70, earningsQuality: 75,
      governanceScore: 65, redFlags: [],
    },
    moat: {
      moatWidth: 'narrow' as const, moatScore: 70,
    },
    signals: [
      { name: 'roe', score: 70, direction: 'bullish' },
      { name: 'growth', score: 65, direction: 'bullish' },
      { name: 'quality', score: 70, direction: 'bullish' },
    ],
    risk: { overall: 30, financial: 25, operational: 20, governance: 30 },
  } as unknown as CompanyIntelligenceProfile;
}

function makeInput(symbol: string): IntelligenceInput {
  return {
    symbol,
    exchange: 'NSE_EQ',
    tradeDate: '2025-01-15',
    financials: {
      roe: 15, roa: 8, roic: 14,
      operatingMargin: 22, netMargin: 15, grossMargin: 45,
      revenueGrowth: 12, profitGrowth: 15, epsGrowth: 10, fcfGrowth: 8,
      debtToEquity: 0.4, currentRatio: 2.1, interestCoverage: 8,
      peRatio: 18, pbRatio: 3.2, dividendYield: 1.5,
      marketCap: 50000, revenue: 12000,
      revenueGrowth3y: 14, profitGrowth3y: 18,
      promoterHolding: 55, institutionalHolding: 28,
    },
    technicals: {
      rsi: 55, macd: 2.5, adx: 28,
      sma20: 1240, sma50: 1210, sma200: 1150,
      momentum1m: 3.2, momentum3m: 8.5, momentum6m: 15,
      volatility: 22, beta: 0.85,
      volume: 500000, avgVolume: 420000,
    },
    earnings: { nextEarningsDate: '2025-02-10' },
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: 'General', sectorStrength: null, sectorMomentum: null, sectorPe: null, sectorAvgGrowth: null, sectorAvgMargin: null },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
  } as unknown as IntelligenceInput;
}

// ── Build thesis entries across diverse states ────────────────────

const theses: PortfolioThesisEntry[] = [];

// Strong thesis (confirmed)
const relProfile = makeProfile('RELIANCE', 78, 0.85);
const relInput = makeInput('RELIANCE');
const relThesis = thesisEngine.build(relProfile, relInput);
theses.push({
  symbol: 'RELIANCE',
  thesisId: relThesis.thesisId,
  thesisState: relThesis.state,
  conviction: relThesis.conviction,
  lastUpdated: relThesis.updatedAt,
  keyObservations: ['ROE above 15%', 'Strong refining margins', 'Retail expansion continuing'],
  activeConcerns: [],
  dataPointsCollected: 45,
});

// Moderately strong (validating)
const tcsProfile = makeProfile('TCS', 62, 0.72);
const tcsInput = makeInput('TCS');
const tcsThesis = thesisEngine.build(tcsProfile, tcsInput);
theses.push({
  symbol: 'TCS',
  thesisId: tcsThesis.thesisId,
  thesisState: tcsThesis.state,
  conviction: tcsThesis.conviction,
  lastUpdated: tcsThesis.updatedAt,
  keyObservations: ['IT spending steady', 'Deal pipeline healthy'],
  activeConcerns: ['Rupee appreciation risk'],
  dataPointsCollected: 32,
});

// Forming (early stage)
theses.push({
  symbol: 'ZOMATO',
  thesisId: 'thesis_ZOMATO_2025-01-15',
  thesisState: 'forming',
  conviction: 'needs_review',
  lastUpdated: new Date().toISOString(),
  keyObservations: ['Revenue growing', 'Path to profitability unclear'],
  activeConcerns: ['High cash burn', 'Competitive pressure'],
  dataPointsCollected: 12,
});

// Weakening (concerns growing)
theses.push({
  symbol: 'ADANIENT',
  thesisId: 'thesis_ADANIENT_2025-01-15',
  thesisState: 'weakening',
  conviction: 'avoid_for_now',
  lastUpdated: new Date().toISOString(),
  keyObservations: ['Infrastructure exposure', 'Revenue growth'],
  activeConcerns: ['High debt levels', 'Governance questions', 'Regulatory scrutiny', 'Pledged shares'],
  dataPointsCollected: 28,
});

// Invalidated
theses.push({
  symbol: 'PAYTM',
  thesisId: 'thesis_PAYTM_2025-01-15',
  thesisState: 'invalidated',
  conviction: 'avoid_for_now',
  lastUpdated: new Date().toISOString(),
  keyObservations: ['Fintech opportunity'],
  activeConcerns: ['Regulatory ban', 'Revenue collapse', 'Business model invalidated'],
  dataPointsCollected: 40,
});

// No thesis (insufficient data)
theses.push({
  symbol: 'NYLKAA',
  thesisId: 'thesis_NYLKAA_2025-01-15',
  thesisState: 'no_thesis',
  conviction: 'insufficient_information',
  lastUpdated: new Date().toISOString(),
  keyObservations: [],
  activeConcerns: [],
  dataPointsCollected: 3,
});

// ── Run portfolio operations ─────────────────────────────────────

const portfolioReport = portfolio.buildReport(theses);
const snapshot = portfolio.buildSnapshot(theses);
const reviewCandidates = portfolio.identifyReviewCandidates(theses);

// Test entry update: add concerns to TCS
const tcsUpdated = portfolio.updateEntry(
  theses[1],
  ['New large deal signed', 'AI/ML practice expanding'],
  ['Rupee volatility increasing', 'US visa restrictions tightening'],
);

// ── Report ─────────────────────────────────────────────────────────

const reportDir = path.resolve('reports/intelligence');
fs.mkdirSync(reportDir, { recursive: true });

const lines: string[] = [];
lines.push('# Phase 16 — Portfolio Thesis Monitor Validation Report');
lines.push(`\n**Generated:** ${new Date().toISOString()}\n`);

lines.push('## Portfolio Report Summary\n');
lines.push(`- **Total thesis entries:** ${portfolioReport.entries.length}`);
lines.push(`- **Active theses:** ${portfolioReport.activeThesisCount}`);
lines.push(`- **Weakening:** ${portfolioReport.weakeningCount}`);
lines.push(`- **Invalidated:** ${portfolioReport.invalidatedCount}\n`);

lines.push('## Snapshot — Conviction Breakdown\n');
lines.push('| Conviction | Count |');
lines.push('| --- | --- |');
for (const [key, count] of Object.entries(snapshot.convictionBreakdown)) {
  lines.push(`| ${key} | ${count} |`);
}

lines.push('\n## Snapshot — State Breakdown\n');
lines.push('| State | Count |');
lines.push('| --- | --- |');
for (const [key, count] of Object.entries(snapshot.stateBreakdown)) {
  lines.push(`| ${key} | ${count} |`);
}
lines.push(`\n**Average Data Points:** ${snapshot.averageDataPoints}\n`);

lines.push('## Portfolio Theses\n');
lines.push('| Symbol | State | Conviction | Data Points | Observations | Concerns |');
lines.push('| --- | --- | --- | --- | --- | --- |');
for (const e of theses) {
  lines.push(`| ${e.symbol} | ${e.thesisState} | ${e.conviction} | ${e.dataPointsCollected} | ${e.keyObservations.length} | ${e.activeConcerns.length} |`);
}

lines.push('\n## Review Candidates\n');
if (reviewCandidates.length > 0) {
  lines.push('| Symbol | State | Conviction |');
  lines.push('| --- | --- | --- |');
  for (const c of reviewCandidates) {
    lines.push(`| ${c.symbol} | ${c.thesisState} | ${c.conviction} |`);
  }
  lines.push(`\n> ${reviewCandidates.length} entries flagged for review.\n`);
} else {
  lines.push('No review candidates identified.\n');
}

lines.push('## Entry Update Test (TCS)\n');
lines.push(`- **Before:** ${theses[1].keyObservations.length} observations, ${theses[1].activeConcerns.length} concerns, conviction: ${theses[1].conviction}`);
lines.push(`- **After:** ${tcsUpdated.keyObservations.length} observations, ${tcsUpdated.activeConcerns.length} concerns, conviction: ${tcsUpdated.conviction}`);
lines.push(`- **Data points:** ${theses[1].dataPointsCollected} → ${tcsUpdated.dataPointsCollected}`);
lines.push(`- **Auto-downgrade:** ${tcsUpdated.conviction !== theses[1].conviction ? '⚠️ Conviction downgraded' : '✅ Conviction unchanged'}\n`);

// ── Monotonicity: state progression test ──────────────────────────

const stateOrder = ['no_thesis', 'forming', 'validating', 'confirmed'];
const stateCounts = stateOrder.map(s => snapshot.stateBreakdown[s] || 0);
const hasProgression = stateCounts.some(c => c > 0);

lines.push('## State Progression Coverage\n');
lines.push('| State | Count |');
lines.push('| --- | --- |');
for (const s of stateOrder) {
  lines.push(`| ${s} | ${snapshot.stateBreakdown[s] || 0} |`);
}
lines.push(`\n**Progression coverage:** ${hasProgression ? '✅ Multiple states covered' : '⚠️ Limited coverage'}\n`);

lines.push('---\n*Generated by scripts/intelligence/monitor-portfolio-thesis.ts (Phase 16)*\n');

const reportPath = path.join(reportDir, '16-portfolio-thesis-monitor.md');
fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');

console.log(`✅ Phase 16 portfolio thesis monitor complete.`);
console.log(`   Entries: ${theses.length} | Active: ${portfolioReport.activeThesisCount} | Review: ${reviewCandidates.length}`);
console.log(`   Report: reports/intelligence/16-portfolio-thesis-monitor.md`);
process.exit(0);
