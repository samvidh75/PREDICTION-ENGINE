#!/usr/bin/env npx tsx
/**
 * validate-rankings.ts — Phase 12
 * Validates ranking outputs for sanity — ensures top performers
 * aren't high-risk, low-confidence, or value-trap signals.
 *
 * Usage: npx tsx scripts/intelligence/validate-rankings.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RankingSanityValidator, type RankedItem } from '../../src/stockstory/intelligence/validation/RankingSanityValidator';

const REPORTS_DIR = path.resolve('reports/intelligence');
const validator = new RankingSanityValidator();

const WATCHLIST_TOP_25: RankedItem[] = [
  { symbol: 'TCS', rank: 1, category: 'compounder', qualityScore: 0.92, riskScore: 0.18, debtToEquity: 0.05, momentumScore: 0.55, confidenceScore: 0.85, convictionLevel: 0.8, dividendYield: 2.8, fiiHolding: 13, promoterHolding: 72 },
  { symbol: 'HDFCBANK', rank: 2, category: 'compounder', qualityScore: 0.88, riskScore: 0.22, debtToEquity: 0.10, momentumScore: 0.48, confidenceScore: 0.82, convictionLevel: 0.75, dividendYield: 1.2, fiiHolding: 37, promoterHolding: 0 },
  { symbol: 'HINDUNILVR', rank: 3, category: 'defensive', qualityScore: 0.90, riskScore: 0.15, debtToEquity: 0.0, momentumScore: 0.40, confidenceScore: 0.88, convictionLevel: 0.7, dividendYield: 2.5, fiiHolding: 14, promoterHolding: 62 },
  { symbol: 'RELIANCE', rank: 4, category: 'compounder', qualityScore: 0.82, riskScore: 0.30, debtToEquity: 0.8, momentumScore: 0.62, confidenceScore: 0.78, convictionLevel: 0.72, dividendYield: 1.5, fiiHolding: 22, promoterHolding: 50 },
  { symbol: 'INFY', rank: 5, category: 'growth_at_reasonable_price', qualityScore: 0.85, riskScore: 0.25, debtToEquity: 0.02, momentumScore: 0.58, confidenceScore: 0.80, convictionLevel: 0.7, dividendYield: 3.2, fiiHolding: 35, promoterHolding: 15 },
  { symbol: 'BHARTIARTL', rank: 6, category: 'cyclical_play', qualityScore: 0.75, riskScore: 0.40, debtToEquity: 1.8, momentumScore: 0.68, confidenceScore: 0.72, convictionLevel: 0.65, dividendYield: 0.8, fiiHolding: 30, promoterHolding: 56 },
  { symbol: 'KOTAKBANK', rank: 7, category: 'compounder', qualityScore: 0.86, riskScore: 0.20, debtToEquity: 0.08, momentumScore: 0.52, confidenceScore: 0.84, convictionLevel: 0.72, dividendYield: 0.6, fiiHolding: 40, promoterHolding: 26 },
  { symbol: 'TITAN', rank: 8, category: 'growth_at_reasonable_price', qualityScore: 0.78, riskScore: 0.28, debtToEquity: 0.35, momentumScore: 0.55, confidenceScore: 0.76, convictionLevel: 0.68, dividendYield: 1.0, fiiHolding: 20, promoterHolding: 52 },
  { symbol: 'ASIANPAINT', rank: 9, category: 'compounder', qualityScore: 0.89, riskScore: 0.18, debtToEquity: 0.02, momentumScore: 0.35, confidenceScore: 0.86, convictionLevel: 0.7, dividendYield: 1.8, fiiHolding: 15, promoterHolding: 52 },
  // Intentionally problematic: high risk + low confidence in top 15
  { symbol: 'ADANIENT', rank: 10, category: 'special_situation', qualityScore: 0.55, riskScore: 0.85, debtToEquity: 2.5, momentumScore: 0.72, confidenceScore: 0.25, convictionLevel: 0.85, dividendYield: 0.1, fiiHolding: 15, promoterHolding: 73 },
  // Value trap: high quality + low momentum in top 20
  { symbol: 'NESTLEIND', rank: 11, category: 'defensive', qualityScore: 0.91, riskScore: 0.12, debtToEquity: 0.0, momentumScore: 0.22, confidenceScore: 0.82, convictionLevel: 0.65, dividendYield: 2.2, fiiHolding: 12, promoterHolding: 63 },
  { symbol: 'MARUTI', rank: 12, category: 'growth_at_reasonable_price', qualityScore: 0.80, riskScore: 0.32, debtToEquity: 0.1, momentumScore: 0.56, confidenceScore: 0.74, convictionLevel: 0.68, dividendYield: 1.0, fiiHolding: 20, promoterHolding: 57 },
  // High debt in top 20
  { symbol: 'JSWSTEEL', rank: 13, category: 'cyclical_play', qualityScore: 0.60, riskScore: 0.65, debtToEquity: 2.8, momentumScore: 0.58, confidenceScore: 0.55, convictionLevel: 0.6, dividendYield: 3.0, fiiHolding: 15, promoterHolding: 45 },
  { symbol: 'SBIN', rank: 14, category: 'dividend_yield', qualityScore: 0.72, riskScore: 0.35, debtToEquity: 0.12, momentumScore: 0.50, confidenceScore: 0.70, convictionLevel: 0.62, dividendYield: 2.8, fiiHolding: 10, promoterHolding: 57 },
  { symbol: 'SUNPHARMA', rank: 15, category: 'growth_at_reasonable_price', qualityScore: 0.77, riskScore: 0.28, debtToEquity: 0.2, momentumScore: 0.54, confidenceScore: 0.75, convictionLevel: 0.66, dividendYield: 1.5, fiiHolding: 25, promoterHolding: 55 },
  // Dividend trap: high div + stability category in top 15
  { symbol: 'COALINDIA', rank: 16, category: 'stability', qualityScore: 0.68, riskScore: 0.25, debtToEquity: 0.0, momentumScore: 0.30, confidenceScore: 0.65, convictionLevel: 0.55, dividendYield: 6.5, fiiHolding: 8, promoterHolding: 63 },
  { symbol: 'NTPC', rank: 17, category: 'defensive', qualityScore: 0.70, riskScore: 0.22, debtToEquity: 1.2, momentumScore: 0.45, confidenceScore: 0.68, convictionLevel: 0.6, dividendYield: 3.5, fiiHolding: 18, promoterHolding: 51 },
  { symbol: 'HAL', rank: 18, category: 'emerging_leader', qualityScore: 0.65, riskScore: 0.38, debtToEquity: 0.0, momentumScore: 0.72, confidenceScore: 0.62, convictionLevel: 0.6, dividendYield: 1.2, fiiHolding: 5, promoterHolding: 71 },
  // Missing data conviction: high conviction + low confidence
  { symbol: 'ADANIGREEN', rank: 19, category: 'emerging_leader', qualityScore: 0.45, riskScore: 0.70, debtToEquity: 4.0, momentumScore: 0.75, confidenceScore: 0.30, convictionLevel: 0.80, dividendYield: 0.0, fiiHolding: 12, promoterHolding: 56 },
  { symbol: 'TATAMOTORS', rank: 20, category: 'cyclical_play', qualityScore: 0.62, riskScore: 0.55, debtToEquity: 1.8, momentumScore: 0.52, confidenceScore: 0.58, convictionLevel: 0.62, dividendYield: 1.0, fiiHolding: 18, promoterHolding: 42 },
  // Low confidence in top positions
  { symbol: 'ZOMATO', rank: 21, category: 'emerging_leader', qualityScore: 0.50, riskScore: 0.55, debtToEquity: 0.1, momentumScore: 0.68, confidenceScore: 0.22, convictionLevel: 0.75, dividendYield: 0.0, fiiHolding: 55, promoterHolding: 0 },
  { symbol: 'TATASTEEL', rank: 22, category: 'cyclical_play', qualityScore: 0.55, riskScore: 0.60, debtToEquity: 1.5, momentumScore: 0.42, confidenceScore: 0.55, convictionLevel: 0.55, dividendYield: 3.0, fiiHolding: 20, promoterHolding: 34 },
  { symbol: 'BEL', rank: 23, category: 'emerging_leader', qualityScore: 0.60, riskScore: 0.30, debtToEquity: 0.0, momentumScore: 0.65, confidenceScore: 0.60, convictionLevel: 0.58, dividendYield: 2.0, fiiHolding: 5, promoterHolding: 51 },
  { symbol: 'TRENT', rank: 24, category: 'growth_at_reasonable_price', qualityScore: 0.72, riskScore: 0.35, debtToEquity: 0.3, momentumScore: 0.60, confidenceScore: 0.68, convictionLevel: 0.65, dividendYield: 0.5, fiiHolding: 25, promoterHolding: 37 },
  { symbol: 'DABUR', rank: 25, category: 'defensive', qualityScore: 0.74, riskScore: 0.20, debtToEquity: 0.05, momentumScore: 0.38, confidenceScore: 0.72, convictionLevel: 0.58, dividendYield: 2.0, fiiHolding: 22, promoterHolding: 66 },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 12 — Ranking Sanity Validation                 ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Ranking Sanity Validation Report', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Rankings Tested:** ${WATCHLIST_TOP_25.length}`, '');

  const issues = validator.validateRankings(WATCHLIST_TOP_25);

  results.push('## Top 25 Rankings', '');
  results.push('| Rank | Symbol | Quality | Risk | Momentum | Confidence | D/E | Issues |');
  results.push('|------|--------|---------|------|----------|------------|-----|--------|');

  for (const item of WATCHLIST_TOP_25) {
    const itemIssues = issues.filter(i => i.symbol === item.symbol);
    const issuesSummary = itemIssues.length === 0 ? '✅' : `⚠️ ${itemIssues.map(i => i.type).join(', ')}`;

    results.push(
      `| ${item.rank} | ${item.symbol} | ${item.qualityScore?.toFixed(2) ?? '-'} | ${item.riskScore?.toFixed(2) ?? '-'} | ${item.momentumScore?.toFixed(2) ?? '-'} | ${item.confidenceScore?.toFixed(2) ?? '-'} | ${item.debtToEquity?.toFixed(2) ?? '-'} | ${issuesSummary} |`,
    );
  }

  results.push('', '## Flagged Issues', '');
  if (issues.length === 0) {
    results.push('✅ All rankings pass sanity checks.');
  } else {
    results.push(`**Total issues:** ${issues.length}`, '');

    // Group by type
    const byType: Record<string, typeof issues> = {};
    for (const issue of issues) {
      (byType[issue.type] ??= []).push(issue);
    }

    for (const [type, typeIssues] of Object.entries(byType)) {
      results.push(`### ${type} (${typeIssues.length})`, '');
      for (const issue of typeIssues) {
        results.push(`- **${issue.symbol}** (Rank #${issue.rank}): ${issue.explanation}`);
      }
      results.push('');
    }
  }

  results.push('## Sanity Check Coverage', '');
  results.push('| Check | Description | Triggered |');
  results.push('|-------|-------------|-----------|');
  results.push(`| severe_risk_top | High risk (>.7) in top 10 | ${issues.filter(i => i.type === 'severe_risk_top').length} |`);
  results.push(`| low_confidence_top | Low confidence (<.3) in top 15 | ${issues.filter(i => i.type === 'low_confidence_top').length} |`);
  results.push(`| value_trap_quality | High quality + low momentum in top 20 | ${issues.filter(i => i.type === 'value_trap_quality').length} |`);
  results.push(`| high_debt_leader | D/E > 2.0 in top 20 | ${issues.filter(i => i.type === 'high_debt_leader').length} |`);
  results.push(`| missing_data_conviction | High conviction + low confidence | ${issues.filter(i => i.type === 'missing_data_conviction').length} |`);
  results.push(`| dividend_trap_stability | Yield >5% in stability top 15 | ${issues.filter(i => i.type === 'dividend_trap_stability').length} |`);

  const reportPath = path.join(REPORTS_DIR, '12-ranking-sanity-validation.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Ranking sanity complete: ${issues.length} issues in ${WATCHLIST_TOP_25.length} rankings`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
