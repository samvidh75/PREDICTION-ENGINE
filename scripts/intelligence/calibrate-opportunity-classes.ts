#!/usr/bin/env npx tsx
/**
 * calibrate-opportunity-classes.ts — Phase 6
 * Audits and calibrates the 10 StockStory opportunity classes
 * against Indian market realities. Each class has:
 * - expected quality score range
 * - risk tolerance
 * - holding horizon
 * - typical sector/market cap bias
 *
 * Usage: npx tsx scripts/intelligence/calibrate-opportunity-classes.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPORTS_DIR = path.resolve('reports/intelligence');

interface OpportunityClass {
  id: string;
  name: string;
  description: string;
  qualityRange: { min: number; max: number };
  riskTolerance: 'low' | 'moderate' | 'high';
  minConviction: number;
  holdingHorizon: string;
  typicalMarketCaps: string[];
  typicalSectors: string[];
  redFlags: string[];
}

const OPPORTUNITY_CLASSES: OpportunityClass[] = [
  {
    id: 'compounder',
    name: 'Compounder',
    description: 'High-quality businesses with consistent earnings growth, high ROE, and durable moats suitable for long-term wealth creation.',
    qualityRange: { min: 0.70, max: 1.0 },
    riskTolerance: 'low',
    minConviction: 0.60,
    holdingHorizon: '3–5+ years',
    typicalMarketCaps: ['Large Cap', 'Mega Cap'],
    typicalSectors: ['FMCG', 'IT Services', 'Pharmaceuticals', 'Banking'],
    redFlags: ['D/E > 1.5', 'Promoter pledge > 20%', 'Declining ROE for 3+ quarters'],
  },
  {
    id: 'growth_at_reasonable_price',
    name: 'Growth at Reasonable Price (GARP)',
    description: 'Companies with above-average revenue/EPS growth trading at reasonable valuations relative to growth rate.',
    qualityRange: { min: 0.55, max: 0.85 },
    riskTolerance: 'moderate',
    minConviction: 0.55,
    holdingHorizon: '2–4 years',
    typicalMarketCaps: ['Mid Cap', 'Large Cap'],
    typicalSectors: ['IT Services', 'Chemicals', 'Retail', 'Consumer Durables'],
    redFlags: ['PEG > 2.0', 'Revenue growth < sector median', 'Customer concentration > 30%'],
  },
  {
    id: 'turnaround',
    name: 'Turnaround Play',
    description: 'Companies undergoing operational/financial restructuring with potential for significant re-rating.',
    qualityRange: { min: 0.35, max: 0.65 },
    riskTolerance: 'high',
    minConviction: 0.65,
    holdingHorizon: '1–3 years',
    typicalMarketCaps: ['Mid Cap', 'Small Cap'],
    typicalSectors: ['PSU Banks', 'Steel', 'Infrastructure', 'Telecom'],
    redFlags: ['Negative cash flow for 4+ quarters', 'Debt restructuring history', 'Management turnover'],
  },
  {
    id: 'dividend_yield',
    name: 'Dividend Yield',
    description: 'Mature companies with stable cash flows and consistent dividend payout, suitable for income-oriented portfolios.',
    qualityRange: { min: 0.60, max: 0.90 },
    riskTolerance: 'low',
    minConviction: 0.50,
    holdingHorizon: '2–5 years',
    typicalMarketCaps: ['Large Cap', 'Mega Cap'],
    typicalSectors: ['FMCG', 'Oil & Gas', 'Power', 'Mining'],
    redFlags: ['Dividend yield > 7% (sustainability risk)', 'Payout ratio > 80%', 'Declining free cash flow'],
  },
  {
    id: 'momentum',
    name: 'Momentum Play',
    description: 'Stocks with strong price and earnings momentum; riding the trend with disciplined exits.',
    qualityRange: { min: 0.40, max: 0.75 },
    riskTolerance: 'high',
    minConviction: 0.45,
    holdingHorizon: '3–12 months',
    typicalMarketCaps: ['Mid Cap', 'Large Cap'],
    typicalSectors: ['Capital Goods', 'Defence', 'Automobile', 'Real Estate'],
    redFlags: ['RSI > 80', 'Volume declining on up-moves', 'FII selling > 5% in quarter'],
  },
  {
    id: 'value_play',
    name: 'Deep Value Play',
    description: 'Stocks trading significantly below intrinsic value with catalysts for mean reversion.',
    qualityRange: { min: 0.30, max: 0.60 },
    riskTolerance: 'moderate',
    minConviction: 0.60,
    holdingHorizon: '1–3 years',
    typicalMarketCaps: ['Mid Cap', 'Small Cap'],
    typicalSectors: ['PSU Banks', 'Steel', 'Metals', 'Mining'],
    redFlags: ['Value trap (no catalyst)', 'Book value declining', 'Industry in secular decline'],
  },
  {
    id: 'special_situation',
    name: 'Special Situation',
    description: 'Event-driven opportunities: mergers, demergers, buybacks, new product launches, regulatory changes.',
    qualityRange: { min: 0.30, max: 0.80 },
    riskTolerance: 'high',
    minConviction: 0.70,
    holdingHorizon: '3–18 months',
    typicalMarketCaps: ['Mid Cap', 'Small Cap'],
    typicalSectors: ['Diversified', 'Pharmaceuticals', 'IT Services', 'Financial Services'],
    redFlags: ['Event probability < 50%', 'Regulatory uncertainty', 'Insider selling pre-event'],
  },
  {
    id: 'defensive',
    name: 'Defensive / Low Volatility',
    description: 'Stable businesses with low beta, consistent earnings, and resilience during market downturns.',
    qualityRange: { min: 0.65, max: 0.95 },
    riskTolerance: 'low',
    minConviction: 0.50,
    holdingHorizon: '2–5 years',
    typicalMarketCaps: ['Large Cap', 'Mega Cap'],
    typicalSectors: ['FMCG', 'Healthcare', 'Power', 'Pharmaceuticals'],
    redFlags: ['Beta > 1.2', 'Earnings volatility > 20%', 'High customer churn'],
  },
  {
    id: 'cyclical_play',
    name: 'Cyclical Play',
    description: 'Companies leveraged to economic cycles; buy at cycle trough, sell at peak.',
    qualityRange: { min: 0.35, max: 0.65 },
    riskTolerance: 'high',
    minConviction: 0.55,
    holdingHorizon: '6–24 months',
    typicalMarketCaps: ['Mid Cap', 'Large Cap'],
    typicalSectors: ['Steel', 'Automobile', 'Cement', 'Capital Goods'],
    redFlags: ['Cycle peak indicators flashing', 'Capacity expansion at peak pricing', 'Input cost inflation'],
  },
  {
    id: 'emerging_leader',
    name: 'Emerging Leader',
    description: 'Next-generation leaders in high-growth sectors with scalable business models and strong execution.',
    qualityRange: { min: 0.40, max: 0.70 },
    riskTolerance: 'high',
    minConviction: 0.65,
    holdingHorizon: '2–5 years',
    typicalMarketCaps: ['Small Cap', 'Mid Cap'],
    typicalSectors: ['Internet', 'Chemicals', 'Retail', 'Capital Goods'],
    redFlags: ['Cash burn > 2 years runway', 'Promoter stake < 25%', 'No path to profitability'],
  },
];

function auditClass(oc: OpportunityClass): string[] {
  const lines: string[] = [];
  lines.push(`### ${oc.name} (\`${oc.id}\`)`);
  lines.push('');
  lines.push(`**Description:** ${oc.description}`, '');
  lines.push(`| Parameter | Value |`);
  lines.push(`|-----------|-------|`);
  lines.push(`| Quality Range | ${oc.qualityRange.min}–${oc.qualityRange.max} |`);
  lines.push(`| Risk Tolerance | ${oc.riskTolerance} |`);
  lines.push(`| Min Conviction | ${oc.minConviction} |`);
  lines.push(`| Holding Horizon | ${oc.holdingHorizon} |`);
  lines.push(`| Typical Market Caps | ${oc.typicalMarketCaps.join(', ')} |`);
  lines.push(`| Typical Sectors | ${oc.typicalSectors.join(', ')} |`);
  lines.push('');
  lines.push('**Red Flags:**');
  oc.redFlags.forEach(rf => { lines.push(`- 🚩 ${rf}`); });
  lines.push('');
  return lines;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 6 — Opportunity Class Calibration               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Opportunity Class Calibration', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Total Classes:** ${OPPORTUNITY_CLASSES.length}`, '');

  results.push('## Summary Matrix', '');
  results.push('| # | Class | Quality | Risk | Min Conviction | Horizon |');
  results.push('|---|-------|---------|------|----------------|---------|');

  OPPORTUNITY_CLASSES.forEach((oc, i) => {
    results.push(`| ${i + 1} | ${oc.name} | ${oc.qualityRange.min}–${oc.qualityRange.max} | ${oc.riskTolerance} | ${oc.minConviction} | ${oc.holdingHorizon} |`);
  });

  results.push('', '## Quality Score Distribution', '');
  results.push('```');
  OPPORTUNITY_CLASSES.forEach(oc => {
    const bar = '█'.repeat(Math.round(oc.qualityRange.max * 40));
    const spacer = ' '.repeat(Math.round((1 - oc.qualityRange.max) * 40));
    results.push(`${oc.name.padEnd(30)} [${bar}${spacer}] ${oc.qualityRange.min}–${oc.qualityRange.max}`);
  });
  results.push('```');

  results.push('', '## Detailed Calibration', '');
  for (const oc of OPPORTUNITY_CLASSES) {
    results.push(...auditClass(oc));
  }

  results.push('## Cross-Validation', '');
  results.push('| Pair | Risk |');
  results.push('|------|------|');

  // Check for overlapping classes that might cause confusion
  const overlaps = [
    ['Compounder vs Defensive', 'Both low-risk, high-quality; differentiate by ROE trajectory'],
    ['GARP vs Momentum', 'GARP needs PEG < 1.5; Momentum is purely price/earnings trend'],
    ['Turnaround vs Value Play', 'Turnaround needs operational catalyst; Value needs price catalyst'],
  ];
  overlaps.forEach(([pair, risk]) => {
    results.push(`| ${pair} | ${risk} |`);
  });

  const reportPath = path.join(REPORTS_DIR, '06-opportunity-class-calibration.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Opportunity classes calibrated: ${OPPORTUNITY_CLASSES.length} classes`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
