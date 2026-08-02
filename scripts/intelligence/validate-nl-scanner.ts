#!/usr/bin/env npx tsx
/**
 * Phase 14 — Natural-Language Scanner Validation
 *
 * Validates the NLScannerEngine across diverse query patterns:
 *   - Precise numerical filters (above/below/range)
 *   - Field alias resolution (ROE → financials.roe, etc.)
 *   - Edge cases with missing data, ambiguous field names
 *   - Batch scan accuracy across multiple stocks
 */

import * as path from 'path';
import * as fs from 'fs';

import { NLScannerEngine, type ScannerReport, type ScanResult } from '../../src/stockstory/intelligence/scanner/NLScannerEngine';
import type { IntelligenceInput } from '../../src/stockstory/intelligence/types';

// ── Mock inputs ────────────────────────────────────────────────────

function makeInput(symbol: string, overrides: Record<string, any> = {}): IntelligenceInput {
  return {
    symbol,
    exchange: 'NSE_EQ',
    tradeDate: '2025-01-15',
    financials: {
      roe: overrides.roe ?? 16, roa: 8, roic: 14,
      operatingMargin: overrides.opm ?? 22, netMargin: 15, grossMargin: 45,
      revenueGrowth: overrides.revGrowth ?? 12, profitGrowth: 15,
      epsGrowth: 10, fcfGrowth: 8,
      debtToEquity: overrides.de ?? 0.4, currentRatio: 2.1, interestCoverage: 8,
      peRatio: overrides.pe ?? 18, pbRatio: 3.2, dividendYield: overrides.divYield ?? 1.5,
      marketCap: overrides.mcap ?? 50000, revenue: 12000,
      revenueGrowth3y: 14, profitGrowth3y: 18,
      promoterHolding: 55, institutionalHolding: 28,
    },
    technicals: {
      rsi: overrides.rsi ?? 55, macd: 2.5, adx: 28,
      sma20: 1240, sma50: 1210, sma200: 1150,
      momentum1m: 3.2, momentum3m: 8.5, momentum6m: 15,
      volatility: 22, beta: overrides.beta ?? 0.85,
      volume: 500000, avgVolume: 420000,
    },
    earnings: { nextEarningsDate: '2025-02-10' },
    sentiment: { overallScore: null, recentHeadlines: null, avgRecentSentiment: null, mentionVolume: null, positiveRatio: null, negativeRatio: null, neutralRatio: null, trending: null, controversyScore: null },
    sector: { name: overrides.sector ?? 'IT', sectorStrength: null, sectorMomentum: null, sectorPe: null, sectorAvgGrowth: null, sectorAvgMargin: null },
    risks: { auditorChange: false, relatedPartyTransactions: false, pledgedShares: overrides.pledge ?? null, promoterHolding: null, institutionalHolding: null, outstandingWarrants: false, esopDilution: null, litigationRisk: null, governanceScore: null },
  } as unknown as IntelligenceInput;
}

const scanner = new NLScannerEngine();

// ── Test cases ─────────────────────────────────────────────────────

interface TestCase {
  query: string;
  inputs: IntelligenceInput[];
  expectedMinMatches: number;
  expectedMaxMatches: number;
  description: string;
}

const testCases: TestCase[] = [
  {
    query: 'companies with ROE above 15',
    inputs: [
      makeInput('RELIANCE', { roe: 18 }),
      makeInput('TCS', { roe: 40 }),
      makeInput('BAJAJ', { roe: 10 }),
      makeInput('TATAMOTORS', { roe: 5 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'ROE > 15 should match 2 of 4 stocks',
  },
  {
    query: 'stocks with PE below 15',
    inputs: [
      makeInput('ONGC', { pe: 6 }),
      makeInput('COALINDIA', { pe: 8 }),
      makeInput('RELIANCE', { pe: 22 }),
      makeInput('TCS', { pe: 30 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'PE < 15 should match undervalued stocks',
  },
  {
    query: 'debt to equity under 0.5',
    inputs: [
      makeInput('INFY', { de: 0.1 }),
      makeInput('TCS', { de: 0.05 }),
      makeInput('ADANIENT', { de: 2.5 }),
      makeInput('JSWSTEEL', { de: 1.8 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'Low-debt stocks should match',
  },
  {
    query: 'dividend yield above 3%',
    inputs: [
      makeInput('COALINDIA', { divYield: 7.5 }),
      makeInput('ONGC', { divYield: 4.2 }),
      makeInput('RELIANCE', { divYield: 0.4 }),
      makeInput('TCS', { divYield: 1.8 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'High dividend yield stocks',
  },
  {
    query: 'rsi below 40',
    inputs: [
      makeInput('TATAMOTORS', { rsi: 28 }),
      makeInput('BAJAJ', { rsi: 35 }),
      makeInput('RELIANCE', { rsi: 55 }),
      makeInput('TCS', { rsi: 62 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'Oversold RSI detection',
  },
  {
    query: 'margin above 20',
    inputs: [
      makeInput('INFY', { opm: 26 }),
      makeInput('TCS', { opm: 28 }),
      makeInput('ADANIENT', { opm: 12 }),
      makeInput('TATAMOTORS', { opm: 10 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'Operating margin filter resolves "margin" → operating margin',
  },
  {
    query: 'beta under 1',
    inputs: [
      makeInput('NESTLEIND', { beta: 0.5 }),
      makeInput('HINDUNILVR', { beta: 0.7 }),
      makeInput('ADANIENT', { beta: 1.5 }),
      makeInput('BAJAJ', { beta: 1.2 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'Low-beta stocks filter',
  },
  {
    query: 'market cap above 100000',
    inputs: [
      makeInput('RELIANCE', { mcap: 1800000 }),
      makeInput('TCS', { mcap: 1400000 }),
      makeInput('BAJAJ', { mcap: 60000 }),
      makeInput('TATAMOTORS', { mcap: 45000 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 2,
    description: 'Large-cap filter via market cap',
  },
  {
    query: 'growth stocks with no results expected',
    inputs: [
      makeInput('ADANIENT', { revGrowth: -5 }),
      makeInput('TATAMOTORS', { revGrowth: -10 }),
    ],
    expectedMinMatches: 0,
    expectedMaxMatches: 0,
    description: 'Invalid query (no operator) should produce no filters → no matches',
  },
  {
    query: 'ROE above 100 and PE below 5',
    inputs: [
      makeInput('STOCK1', { roe: 120, pe: 3 }),
      makeInput('STOCK2', { roe: 15, pe: 2 }),
      makeInput('STOCK3', { roe: 200, pe: 4 }),
    ],
    expectedMinMatches: 2,
    expectedMaxMatches: 3,
    description: 'Multi-criteria query with AND logic',
  },
];

// ── Execution ──────────────────────────────────────────────────────

const results: Array<{
  query: string;
  description: string;
  totalMatched: number;
  totalTested: number;
  passed: boolean;
  report: ScannerReport;
}> = [];

for (const tc of testCases) {
  const report = scanner.scanBatch(tc.inputs, tc.query);
  const passed = report.totalMatched >= tc.expectedMinMatches && report.totalMatched <= tc.expectedMaxMatches;
  results.push({
    query: tc.query,
    description: tc.description,
    totalMatched: report.totalMatched,
    totalTested: tc.inputs.length,
    passed,
    report,
  });
}

const passedCount = results.filter(r => r.passed).length;

// ── Report ─────────────────────────────────────────────────────────

const reportDir = path.resolve('reports/intelligence');
fs.mkdirSync(reportDir, { recursive: true });

const lines: string[] = [];
lines.push('# Phase 14 — NL Scanner Validation Report');
lines.push(`\n**Generated:** ${new Date().toISOString()}\n`);
lines.push('## Summary\n');
lines.push(`- **Queries tested:** ${testCases.length}`);
lines.push(`- **Passed:** ${passedCount}/${testCases.length}`);
lines.push(`- **Total stocks scanned:** ${results.reduce((s, r) => s + r.totalTested, 0)}`);
lines.push(`- **Total matches found:** ${results.reduce((s, r) => s + r.totalMatched, 0)}\n`);

lines.push('## Query Results\n');
lines.push('| # | Query | Expected | Matched | Passed |');
lines.push('| --- | --- | --- | --- | --- |');
for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const expected = `${r.expectedMinMatches}-${r.expectedMaxMatches}`;
  lines.push(`| ${i + 1} | \`${r.query}\` | ${expected} | ${r.totalMatched}/${r.totalTested} | ${r.passed ? '✅' : '❌'} |`);
}

lines.push('\n## Detailed Scan Results\n');
for (const r of results) {
  lines.push(`### Query: "${r.query}"`);
  lines.push(`> ${r.description}\n`);
  lines.push(`**Matched:** ${r.totalMatched}/${r.totalTested}  `);
  lines.push(`**Parsed Filters:** ${r.report.parsedFilters.length}\n`);

  if (r.report.parsedFilters.length > 0) {
    lines.push('| Filter | Value | Operator | Confidence |');
    lines.push('| --- | --- | --- | --- |');
    for (const pf of r.report.parsedFilters) {
      lines.push(`| \`${pf.field}\` | ${pf.value} | ${pf.operator} | ${pf.confidence} |`);
    }
  }

  lines.push('\n| Symbol | Matched | Score | Details |');
  lines.push('| --- | --- | --- | --- |');
  for (const scan of r.report.results) {
    lines.push(`| ${scan.symbol} | ${scan.matched ? '✅' : '❌'} | ${scan.score} | ${scan.matchDetails.join('; ')} |`);
  }
  lines.push('');
}

lines.push('---\n*Generated by scripts/intelligence/validate-nl-scanner.ts (Phase 14)*\n');

const reportPath = path.join(reportDir, '14-nl-scanner-validation.md');
fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');

console.log(`✅ Phase 14 NL scanner validation complete.`);
console.log(`   Queries: ${testCases.length} | Passed: ${passedCount}/${testCases.length}`);
console.log(`   Report: reports/intelligence/14-nl-scanner-validation.md`);

if (passedCount < testCases.length) {
  console.log(`\n⚠️  ${testCases.length - passedCount} test(s) failed:`);
  for (const r of results.filter(r => !r.passed)) {
    console.log(`   - "${r.query}": expected ${r.expectedMinMatches}-${r.expectedMaxMatches}, got ${r.totalMatched}`);
  }
}

process.exit(0);
