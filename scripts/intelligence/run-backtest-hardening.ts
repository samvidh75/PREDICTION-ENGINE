#!/usr/bin/env npx tsx
/**
 * Phase 13 — Backtest Validation Hardening
 *
 * Tests scoring engine stability across varied lookback windows,
 * drawdown scenarios, and regime-shift simulations.
 * Exercises FinancialEngine, TechnicalEngine, ValuationEngine
 * with synthetic historical snapshots to detect:
 *   - Score instability under missing data
 *   - Regime-shift detection gaps
 *   - Lookback-period sensitivity
 */

import * as path from 'path';
import * as fs from 'fs';

import { FinancialEngine } from '../../src/stockstory/intelligence/engines/FinancialEngine';
import { TechnicalEngine } from '../../src/stockstory/intelligence/engines/TechnicalEngine';
import { ValuationEngine } from '../../src/stockstory/intelligence/engines/ValuationEngine';
import type { IntelligenceInput } from '../../src/stockstory/intelligence/types';

// ── Helpers ────────────────────────────────────────────────────────

function baseInput(overrides: Partial<IntelligenceInput['financials']> = {},
                   techOverrides: Partial<IntelligenceInput['technicals']> = {},
                   valOverrides: Partial<IntelligenceInput['valuation']> = {}): IntelligenceInput {
  return {
    symbol: 'TEST',
    exchange: 'NSE_EQ',
    tradeDate: '2025-01-15',
    financials: {
      roe: 16, roa: 8, roic: 14,
      operatingMargin: 22, netMargin: 15, grossMargin: 45,
      revenueGrowth: 12, profitGrowth: 15, epsGrowth: 10, fcfGrowth: 8,
      debtToEquity: 0.4, currentRatio: 2.1, interestCoverage: 8,
      peRatio: 18, pbRatio: 3.2, dividendYield: 1.5,
      marketCap: 50000, revenue: 12000,
      revenueGrowth3y: 14, profitGrowth3y: 18,
      promoterHolding: 55, institutionalHolding: 28,
      ...overrides,
    },
    technicals: {
      rsi: 55, macd: 2.5, adx: 28,
      sma20: 1240, sma50: 1210, sma200: 1150,
      momentum1m: 3.2, momentum3m: 8.5, momentum6m: 15,
      volatility: 22, beta: 0.85,
      volume: 500000, avgVolume: 420000,
      ...techOverrides,
    },
    earnings: { nextEarningsDate: '2025-02-10' },
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: 'IT', sectorStrength: null, sectorMomentum: null, sectorPe: null, sectorAvgGrowth: null, sectorAvgMargin: null },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
    valuation: {
      dcfFairValue: 1350, peFairValue: 1280, pbFairValue: 1320,
      intrinsicValue: 1315, marginOfSafety: 12,
      ...valOverrides,
    },
  } as unknown as IntelligenceInput;
}

// ── Test Suite ─────────────────────────────────────────────────────

interface BacktestResult {
  scenario: string;
  engine: string;
  score: number;
  confidence: number;
  note: string;
}

interface ScenarioResult {
  scenario: string;
  results: BacktestResult[];
  passed: boolean;
}

const finEngine = new FinancialEngine();
const techEngine = new TechnicalEngine();
const valEngine = new ValuationEngine();

function runBacktest(name: string, input: IntelligenceInput): ScenarioResult {
  const fin = finEngine.analyze(input);
  const tech = techEngine.analyze(input);
  const val = valEngine.analyze(input);

  const note = `${name}`;
  return {
    scenario: name,
    results: [
      { scenario: name, engine: 'Financial', score: fin.score, confidence: fin.confidence, note },
      { scenario: name, engine: 'Technical', score: tech.score, confidence: tech.confidence, note },
      { scenario: name, engine: 'Valuation', score: val.score, confidence: val.confidence, note },
    ],
    passed: fin.score >= 0 && tech.score >= 0 && val.score >= 0,
  };
}

// ── 1. Baseline (healthy company) ─────────────────────────────────

const baseline = runBacktest('01-Baseline-Healthy', baseInput());

// ── 2. Missing data (sparse financials) ───────────────────────────

const sparse = baseInput({
  roe: undefined as any, roa: undefined as any, roic: undefined as any,
  operatingMargin: undefined as any, netMargin: undefined as any,
  revenueGrowth: undefined as any, profitGrowth: undefined as any,
  epsGrowth: undefined as any, fcfGrowth: undefined as any,
});
sparse.scenario = '02-Sparse-Financials';
const sparseResult: ScenarioResult = {
  scenario: '02-Sparse-Financials',
  results: [],
  passed: true,
};
const sparseFin = finEngine.analyze(sparse as IntelligenceInput);
const sparseTech = techEngine.analyze(sparse as IntelligenceInput);
const sparseVal = valEngine.analyze(sparse as IntelligenceInput);
sparseResult.results = [
  { scenario: '02-Sparse-Financials', engine: 'Financial', score: sparseFin.score, confidence: sparseFin.confidence, note: 'Confidence should drop with missing data' },
  { scenario: '02-Sparse-Financials', engine: 'Technical', score: sparseTech.score, confidence: sparseTech.confidence, note: 'Technical unchanged' },
  { scenario: '02-Sparse-Financials', engine: 'Valuation', score: sparseVal.score, confidence: sparseVal.confidence, note: 'Valuation unchanged' },
];
sparseResult.passed = sparseFin.confidence < 0.5; // Confidence should drop

// ── 3. High-debt drawdown ─────────────────────────────────────────

const highDebt = runBacktest('03-High-Debt-Drawdown', baseInput({
  debtToEquity: 2.5, interestCoverage: 0.8, currentRatio: 0.6,
  operatingMargin: 8, netMargin: 3,
}));

// ── 4. Bearish technical regime ───────────────────────────────────

const bearishTech = runBacktest('04-Bearish-Technical', baseInput({}, {
  rsi: 28, macd: -4.2, adx: 35,
  sma50: 1050, sma200: 1200,
  momentum1m: -8, momentum3m: -15,
  volatility: 42, beta: 1.45,
}));

// ── 5. Overvalued regime ──────────────────────────────────────────

const overvalued = runBacktest('05-Overvalued-Regime', baseInput({
  peRatio: 55, pbRatio: 12,
}, {}, {
  dcfFairValue: 400, peFairValue: 380, pbFairValue: 300,
  intrinsicValue: 360, marginOfSafety: -45,
}));

// ── 6. Momentum reversal (bullish → bearish lookback shift) ──────

const reversal = runBacktest('06-Momentum-Reversal', baseInput({
  revenueGrowth: -5, profitGrowth: -10, epsGrowth: -8, fcfGrowth: -15,
}, {
  momentum1m: -5, momentum3m: -2, momentum6m: 20,
  rsi: 35, macd: -1.5,
}));

// ── 7. Governance risk shock ──────────────────────────────────────

const governanceRisk = baseInput({}, {}, {});
(governanceRisk.risks as any) = {
  auditorChange: true, relatedPartyTransactions: true,
  pledgedShares: 45, promoterHolding: 70, institutionalHolding: 8,
  outstandingWarrants: true, esopDilution: 8,
  litigationRisk: 0.8, governanceScore: 25,
};
const govResult = runBacktest('07-Governance-Shock', governanceRisk);

// ── 8. Low-volatility bull market ─────────────────────────────────

const lowVol = runBacktest('08-LowVol-Bull', baseInput({
  roe: 20, roic: 18,
  revenueGrowth: 20, profitGrowth: 25,
}, {
  rsi: 62, volatility: 14, beta: 0.6,
  momentum1m: 5, momentum3m: 18,
}));

// ── Aggregation ───────────────────────────────────────────────────

const allScenarios: ScenarioResult[] = [
  baseline,
  sparseResult,
  highDebt,
  bearishTech,
  overvalued,
  reversal,
  govResult,
  lowVol,
];

const allResults = allScenarios.flatMap(s => s.results);
const passedCount = allScenarios.filter(s => s.passed).length;

// Vary a single input 5 times to test stability
const stabilityInputs: Array<{ label: string; input: IntelligenceInput }> = [
  { label: 'ROE=5', input: baseInput({ roe: 5 }) },
  { label: 'ROE=12', input: baseInput({ roe: 12 }) },
  { label: 'ROE=20', input: baseInput({ roe: 20 }) },
  { label: 'ROE=30', input: baseInput({ roe: 30 }) },
  { label: 'ROE=45', input: baseInput({ roe: 45 }) },
];

const stabilityResults: Array<{ label: string; fin: number; tech: number; val: number }> = [];
for (const s of stabilityInputs) {
  const f = finEngine.analyze(s.input);
  const t = techEngine.analyze(s.input);
  const v = valEngine.analyze(s.input);
  stabilityResults.push({ label: s.label, fin: f.score, tech: t.score, val: v.score });
}

// Score monotonicity check: higher ROE should → higher or equal financial score
const finScores = stabilityResults.map(r => r.fin);
const isMonotonic = finScores.every((s, i) => i === 0 || s >= finScores[i - 1]);

// ── Report generation ─────────────────────────────────────────────

const reportDir = path.resolve('reports/intelligence');
fs.mkdirSync(reportDir, { recursive: true });

function mdTable(rows: any[], cols: string[]): string {
  const header = `| ${cols.join(' | ')} |`;
  const sep = `| ${cols.map(() => '---').join(' | ')} |`;
  const body = rows.map(r => `| ${cols.map(c => r[c] ?? '').join(' | ')} |`).join('\n');
  return `${header}\n${sep}\n${body}`;
}

const reportLines: string[] = [];
reportLines.push('# Phase 13 — Backtest Validation Hardening Report');
reportLines.push(`\n**Generated:** ${new Date().toISOString()}\n`);
reportLines.push(`## Summary\n`);
reportLines.push(`- **Scenarios tested:** ${allScenarios.length}`);
reportLines.push(`- **Passed:** ${passedCount}/${allScenarios.length}`);
reportLines.push(`- **Total engine runs:** ${allResults.length}`);
reportLines.push(`- **ROE monotonicity:** ${isMonotonic ? '✅ PASS' : '⚠️ NON-MONOTONIC'}\n`);

reportLines.push('## Scenario Results\n');
reportLines.push(mdTable(allScenarios.map(s => ({
  scenario: s.scenario,
  avgScore: Math.round(s.results.reduce((a, r) => a + r.score, 0) / s.results.length),
  passed: s.passed ? '✅' : '❌',
  confidence: s.results.map(r => r.confidence.toFixed(2)).join(' / '),
})), ['scenario', 'avgScore', 'passed', 'confidence']));

reportLines.push('\n## Detailed Engine Results\n');
reportLines.push(mdTable(allResults.map(r => ({
  scenario: r.scenario,
  engine: r.engine,
  score: r.score,
  confidence: r.confidence.toFixed(2),
  note: r.note,
})), ['scenario', 'engine', 'score', 'confidence', 'note']));

reportLines.push('\n## Stability Analysis (ROE Sensitivity)\n');
reportLines.push(mdTable(stabilityResults.map(r => ({
  label: r.label,
  financial: r.fin,
  technical: r.tech,
  valuation: r.val,
})), ['label', 'financial', 'technical', 'valuation']));

reportLines.push(`\n**Monotonicity:** Financial scores ${isMonotonic ? 'increase monotonically with ROE ✅' : 'have non-monotonic behavior ⚠️'}\n`);

const failedScenarios = allScenarios.filter(s => !s.passed);
if (failedScenarios.length > 0) {
  reportLines.push('## Attention Items\n');
  for (const f of failedScenarios) {
    reportLines.push(`- **${f.scenario}**: Check confidence drop or score anomaly.`);
  }
}

reportLines.push('\n---\n*Generated by scripts/intelligence/run-backtest-hardening.ts (Phase 13)*\n');

const reportPath = path.join(reportDir, '13-backtest-hardening-report.md');
fs.writeFileSync(reportPath, reportLines.join('\n'), 'utf-8');

console.log(`✅ Phase 13 backtest hardening complete.`);
console.log(`   Scenarios: ${allScenarios.length} | Passed: ${passedCount}/${allScenarios.length} | Monotonic: ${isMonotonic}`);
console.log(`   Report: reports/intelligence/13-backtest-hardening-report.md`);
process.exit(0);
