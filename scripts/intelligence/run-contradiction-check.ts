#!/usr/bin/env npx tsx
/**
 * run-contradiction-check.ts — Phase 10
 * Uses the ContradictionDetector to cross-check thesis
 * claims against risk profiles and flag contradictions.
 *
 * Usage: npx tsx scripts/intelligence/run-contradiction-check.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ContradictionDetector, type ThesisClaim, type RiskClaim } from '../../src/stockstory/intelligence/quality/ContradictionDetector';

const REPORTS_DIR = path.resolve('reports/intelligence');
const detector = new ContradictionDetector();

interface ThesisTestCase {
  symbol: string;
  thesisType: string;
  claims: ThesisClaim[];
  risks: RiskClaim[];
}

const TEST_CASES: ThesisTestCase[] = [
  {
    symbol: 'TCS',
    thesisType: 'bullish_growth',
    claims: [
      { id: 'tcs-1', type: 'bullish', factor: 'growth', text: 'Consistent revenue growth in USD terms', score: 0.85, confidence: 0.9 },
      { id: 'tcs-2', type: 'bullish', factor: 'growth', text: 'Industry-leading margins and deal pipeline', score: 0.8, confidence: 0.85 },
    ],
    risks: [
      { id: 'tcs-r1', type: 'financial', severity: 'medium', text: 'Revenue stagnation in BFSI vertical possible' },
    ],
  },
  {
    symbol: 'HDFCBANK',
    thesisType: 'bullish_quality',
    claims: [
      { id: 'hdfc-1', type: 'bullish', factor: 'quality', text: 'Best-in-class asset quality with low GNPA', score: 0.9, confidence: 0.88 },
    ],
    risks: [
      { id: 'hdfc-r1', type: 'operational', severity: 'medium', text: 'InputCostRising from deposit rate hikes across banking' },
    ],
  },
  {
    symbol: 'ADANIENT',
    thesisType: 'bullish_momentum',
    claims: [
      { id: 'adani-1', type: 'bullish', factor: 'momentum', text: 'Strong price momentum across group companies', score: 0.75, confidence: 0.8 },
    ],
    risks: [
      { id: 'adani-r1', type: 'financial', severity: 'critical', text: 'DebtRising significantly across group companies' },
      { id: 'adani-r2', type: 'valuation', severity: 'high', text: 'Stock is overbought on technical indicators — overbought signal' },
    ],
  },
  {
    symbol: 'ZOMATO',
    thesisType: 'bullish_growth',
    claims: [
      { id: 'zom-1', type: 'bullish', factor: 'growth', text: 'Food delivery duopoly driving revenue growth', score: 0.7, confidence: 0.75 },
    ],
    risks: [
      { id: 'zom-r1', type: 'financial', severity: 'medium', text: 'DecliningRevenue in non-metro markets offsetting growth' },
      { id: 'zom-r2', type: 'financial', severity: 'medium', text: 'Revenue stagnation in tier-1 cities after saturation' },
    ],
  },
  {
    symbol: 'ITC',
    thesisType: 'bullish_dividend',
    claims: [
      { id: 'itc-1', type: 'bullish', factor: 'dividend', text: 'Stable cash flow generation from cigarettes', score: 0.8, confidence: 0.8 },
    ],
    risks: [
      { id: 'itc-r1', type: 'financial', severity: 'high', text: 'CashFlowDeteriorating from regulatory pressure on tobacco' },
    ],
  },
  {
    symbol: 'JSWSTEEL',
    thesisType: 'bearish_risk',
    claims: [
      { id: 'jsw-1', type: 'bearish', factor: 'risk', text: 'Global steel prices peaking, demand slowing', score: 0.65, confidence: 0.7 },
    ],
    risks: [
      { id: 'jsw-r1', type: 'financial', severity: 'medium', text: 'StrongBalanceSheet with low leverage and ample liquidity' },
      { id: 'jsw-r2', type: 'valuation', severity: 'medium', text: 'Stock trading at deepValue multiples — EV/EBITDA below 5x' },
    ],
  },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 10 — Contradiction Detection                   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Contradiction Detection Report', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Theses Tested:** ${TEST_CASES.length}`, '');

  results.push('## Results Summary', '');
  results.push('| # | Symbol | Thesis | Claims | Risks | Contradictions | Passed |');
  results.push('|---|--------|--------|--------|-------|----------------|--------|');

  let totalContradictions = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const result = detector.detect(tc.claims, tc.risks);
    totalContradictions += result.contradictionCount;

    results.push(
      `| ${i + 1} | ${tc.symbol} | ${tc.thesisType} | ${tc.claims.length} | ${tc.risks.length} | ${result.contradictionCount} | ${result.passed ? '✅ Pass' : '❌ Fail'} |`,
    );
  }

  results.push('', '## Detailed Findings', '');
  for (const tc of TEST_CASES) {
    const result = detector.detect(tc.claims, tc.risks);
    if (result.contradictions.length > 0) {
      results.push(`### ${tc.symbol} — ${tc.thesisType}`, '');
      results.push('**Contradictions:**');
      for (const c of result.contradictions) {
        results.push(`- 🚩 **${c.severity}:** ${c.reason}`);
      }
      results.push('');
    }
  }

  results.push('## Summary Statistics', '');
  results.push(`- **Total theses tested:** ${TEST_CASES.length}`);
  results.push(`- **Total contradictions found:** ${totalContradictions}`);
  results.push(`- **Clean theses:** ${TEST_CASES.filter(tc => detector.detect(tc.claims, tc.risks).passed).length}`);

  const reportPath = path.join(REPORTS_DIR, '10-contradiction-detection-report.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Contradiction detection complete: ${totalContradictions} contradictions in ${TEST_CASES.length} theses`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
