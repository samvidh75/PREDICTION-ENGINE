#!/usr/bin/env npx tsx
/**
 * score-explanations.ts — Phase 11
 * Validates research explanations for clarity, completeness,
 * evidence alignment, and compliance-safe language.
 *
 * Usage: npx tsx scripts/intelligence/score-explanations.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ExplainabilityQA } from '../../src/stockstory/intelligence/quality/ExplainabilityQA';

const REPORTS_DIR = path.resolve('reports/intelligence');
const qa = new ExplainabilityQA();

interface ExplanationEntry {
  symbol: string;
  context: string;
  explanation: string;
  expectedRating: 'pass' | 'partial' | 'fail';
}

const EXPLANATIONS: ExplanationEntry[] = [
  {
    symbol: 'TCS',
    context: 'Q3FY24 Results',
    explanation: 'TCS reported 5.5% QoQ constant currency revenue growth, driven by BFSI recovery and mega-deal ramp-up. Operating margins expanded 70bps to 25.0%, supported by pyramid optimization and utilization gains. Based on Q3FY24 data, the thesis of sustained IT services demand remains intact. Review risk from client concentration in BFSI verticals.',
    expectedRating: 'pass',
  },
  {
    symbol: 'HDFCBANK',
    context: 'Annual Report Analysis',
    explanation: 'HDFC Bank delivered 16% YoY net profit growth with GNPA ratio improving to 1.26%. Merger synergies with HDFC Ltd are tracking ahead of schedule. Monitor thesis for deposit growth trajectory and NIM compression risk from rising cost of funds. The risk of slower-than-expected retail deposit mobilization should be watched.',
    expectedRating: 'pass',
  },
  {
    symbol: 'ADANIENT',
    context: 'Market Update',
    explanation: 'Buy this stock now! Guaranteed returns! It will double in 6 months because the promoter said so. This is a sure-shot multibagger.',
    expectedRating: 'fail',
  },
  {
    symbol: 'RELIANCE',
    context: 'Quarterly Review',
    explanation: 'Good quarter.',
    expectedRating: 'fail',
  },
  {
    symbol: 'TATAMOTORS',
    context: 'JLR Performance',
    explanation: 'JLR wholesale volumes grew 8% YoY. EV subsidiary IPO on track. Monitor thesis around debt reduction and margin improvement. Risk: luxury car demand slowdown in China and Europe.',
    expectedRating: 'pass',
  },
  {
    symbol: 'ZOMATO',
    context: 'Quick Commerce',
    explanation: 'Blinkit dark store count crossed 500, GOV per store improving. Contribution margin turned positive. Buy this stock for guaranteed listing gains. It is a multibagger recommendation with zero risk.',
    expectedRating: 'fail',
  },
  {
    symbol: 'ITC',
    context: 'Business Update',
    explanation: 'ITC hotel business demerger effective. Cigarette volume growth stable at 3%. FMCG segment margins improving. Based on current data, thesis for stable cash flow generation and dividend yield remains valid.',
    expectedRating: 'pass',
  },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 11 — Explanation Quality Scoring               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Explanation Quality Scoring Report', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Explanations Tested:** ${EXPLANATIONS.length}`, '');

  results.push('## Scoring Results', '');
  results.push('| # | Symbol | Context | Length | Readable | Evidence | Forbidden | Pref Lang | Complete | Passed | Expected | Match? |');
  results.push('|---|--------|---------|--------|----------|----------|-----------|-----------|----------|--------|----------|--------|');

  let totalPassed = 0;

  for (let i = 0; i < EXPLANATIONS.length; i++) {
    const entry = EXPLANATIONS[i];
    const result = qa.validateExplanation(entry.symbol, entry.explanation);
    if (result.passed) totalPassed++;

    const match = (result.passed && entry.expectedRating === 'pass') ||
                  (!result.passed && entry.expectedRating === 'fail') ||
                  (entry.expectedRating === 'partial');

    results.push(
      `| ${i + 1} | ${entry.symbol} | ${entry.context} | ${entry.explanation.length}c | ${result.readable ? '✅' : '❌'} | ${result.evidenceAligned ? '✅' : '❌'} | ${result.hasForbiddenPhrases ? `❌ ${result.forbiddenFound.length}` : '✅'} | ${result.usesPreferredLanguage ? '✅' : '❌'} | ${result.complete ? '✅' : '❌'} | ${result.passed ? '✅' : '❌'} | ${entry.expectedRating} | ${match ? '✅' : '❌'} |`,
    );
  }

  results.push('', '## Failed Explanations', '');
  for (const entry of EXPLANATIONS) {
    const result = qa.validateExplanation(entry.symbol, entry.explanation);
    if (!result.passed) {
      results.push(`### ${entry.symbol} — ${entry.context}`, '');
      results.push(`**Explanation:** "${entry.explanation}"`, '');
      if (result.forbiddenFound.length > 0) {
        results.push(`**Forbidden phrases:** ${result.forbiddenFound.join(', ')}`);
      }
      results.push('**Issues:**');
      for (const issue of result.issues) {
        results.push(`- ${issue.severity}: ${issue.reason}`);
      }
      results.push('');
    }
  }

  results.push('## Forbidden Phrase Analysis', '');
  results.push(`- **Investment phrases scanned:** FORBIDDEN_INVESTMENT_PHRASES`);
  results.push(`- **Backend phrases scanned:** FORBIDDEN_BACKEND_PHRASES`);
  results.push(`- **Preferred language terms:** ALLOWED_USER_LANGUAGE`);

  const allForbidden = new Set<string>();
  for (const entry of EXPLANATIONS) {
    const result = qa.validateExplanation(entry.symbol, entry.explanation);
    result.forbiddenFound.forEach(f => allForbidden.add(f));
  }
  if (allForbidden.size > 0) {
    results.push(`- **Detected:** ${[...allForbidden].join(', ')}`);
  }

  results.push('', '## Summary', '');
  results.push(`- **Total:** ${EXPLANATIONS.length}`);
  results.push(`- **Passed:** ${totalPassed}`);
  results.push(`- **Failed:** ${EXPLANATIONS.length - totalPassed}`);
  results.push(`- **Pass rate:** ${((totalPassed / EXPLANATIONS.length) * 100).toFixed(1)}%`);

  const reportPath = path.join(REPORTS_DIR, '11-explanation-quality-scoring.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Explanation QA complete: ${totalPassed}/${EXPLANATIONS.length} passed`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
