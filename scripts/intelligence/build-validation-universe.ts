#!/usr/bin/env npx tsx
/**
 * build-validation-universe.ts — Phase 3
 * Builds the market universe test set for validation.
 * Selects representative symbols across sectors, market caps, and risk profiles.
 *
 * Usage: npx tsx scripts/intelligence/build-validation-universe.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { MarketRealityValidator } from '../../src/stockstory/intelligence/validation/MarketRealityValidator';

const REPORTS_DIR = path.resolve('reports/intelligence');

interface UniverseEntry {
  symbol: string;
  sector: string;
  marketCap: number;
  riskProfile: string;
  rationale: string;
}

const TEST_UNIVERSE: UniverseEntry[] = [
  // Mega Caps — market leaders
  { symbol: 'RELIANCE', sector: 'Oil & Gas', marketCap: 2000000, riskProfile: 'low', rationale: 'Largest Indian company by market cap; diversified conglomerate' },
  { symbol: 'TCS', sector: 'IT Services', marketCap: 1500000, riskProfile: 'low', rationale: 'IT bellwether; high ROE and consistent dividend payer' },
  { symbol: 'HDFCBANK', sector: 'Banking', marketCap: 1200000, riskProfile: 'low', rationale: 'Premier private bank; strong asset quality track record' },

  // Large Caps — diversified leaders
  { symbol: 'INFY', sector: 'IT Services', marketCap: 750000, riskProfile: 'low', rationale: 'Second-largest IT exporter; global delivery model' },
  { symbol: 'ICICIBANK', sector: 'Banking', marketCap: 750000, riskProfile: 'low', rationale: 'Second-largest private bank; improving NPA ratios' },
  { symbol: 'HINDUNILVR', sector: 'FMCG', marketCap: 600000, riskProfile: 'low', rationale: 'FMCG leader; defensive play with consistent dividend' },
  { symbol: 'BHARTIARTL', sector: 'Telecom', marketCap: 650000, riskProfile: 'moderate', rationale: 'Telecom leader; high capex but strong subscriber base' },
  { symbol: 'SBIN', sector: 'Banking', marketCap: 550000, riskProfile: 'moderate', rationale: 'Largest PSU bank; proxy for Indian economic growth' },

  // Mid Caps — growth stories
  { symbol: 'KOTAKBANK', sector: 'Banking', marketCap: 400000, riskProfile: 'low', rationale: 'Well-managed private bank; consistent growth' },
  { symbol: 'TITAN', sector: 'Consumer Durables', marketCap: 300000, riskProfile: 'moderate', rationale: 'Jewellery and watch leader; premiumization theme' },
  { symbol: 'ASIANPAINT', sector: 'Paints', marketCap: 280000, riskProfile: 'moderate', rationale: 'Paint sector leader; strong brand moat' },
  { symbol: 'MARUTI', sector: 'Automobile', marketCap: 350000, riskProfile: 'moderate', rationale: 'Passenger vehicle leader; EV transition watch' },
  { symbol: 'SUNPHARMA', sector: 'Pharmaceuticals', marketCap: 300000, riskProfile: 'moderate', rationale: 'Pharma leader; US generics + specialty pipeline' },
  { symbol: 'NESTLEIND', sector: 'FMCG', marketCap: 250000, riskProfile: 'low', rationale: 'MNC FMCG with pricing power and brand recall' },

  // Riskier/Volatile symbols for stress testing
  { symbol: 'TATAMOTORS', sector: 'Automobile', marketCap: 280000, riskProfile: 'high', rationale: 'Cyclical auto; JLR performance drives valuation' },
  { symbol: 'JSWSTEEL', sector: 'Steel', marketCap: 200000, riskProfile: 'high', rationale: 'Commodity cyclical; high beta to economic cycle' },
  { symbol: 'ADANIENT', sector: 'Diversified', marketCap: 350000, riskProfile: 'high', rationale: 'High volatility; multiple business verticals' },
  { symbol: 'ZOMATO', sector: 'Internet', marketCap: 150000, riskProfile: 'high', rationale: 'New-age tech; path to profitability narrative' },
  { symbol: 'HAL', sector: 'Defence', marketCap: 250000, riskProfile: 'moderate', rationale: 'Defence PSU; government order book visibility' },

  // Small/emerging — data completeness testing
  { symbol: 'DIVISLAB', sector: 'Pharmaceuticals', marketCap: 120000, riskProfile: 'moderate', rationale: 'API manufacturer; niche pharma play' },
  { symbol: 'PIDILITIND', sector: 'Chemicals', marketCap: 130000, riskProfile: 'low', rationale: 'Adhesives monopoly; consistent compounder' },
  { symbol: 'BEL', sector: 'Defence', marketCap: 180000, riskProfile: 'moderate', rationale: 'Defence electronics; Make-in-India beneficiary' },
  { symbol: 'TRENT', sector: 'Retail', marketCap: 140000, riskProfile: 'moderate', rationale: 'Fashion retail; strong same-store growth' },
  { symbol: 'DABUR', sector: 'FMCG', marketCap: 100000, riskProfile: 'low', rationale: 'Ayurvedic FMCG; rural demand proxy' },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 3 — Build Market Universe Test Set              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const validator = new MarketRealityValidator();
  const results: string[] = [];

  console.log(`🔍 Validating ${TEST_UNIVERSE.length} symbols against known NSE universe...\n`);

  const summary = await validator.validateBatch(
    TEST_UNIVERSE.map(s => s.symbol),
    TEST_UNIVERSE.map(s => ({ sector: s.sector, marketCap: s.marketCap })),
  );

  // Build report
  results.push('# Market Universe — Validation Test Set', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Status:** ${summary.status.toUpperCase()}`, '');
  results.push(`- **Total Symbols:** ${summary.totalSymbols}`, `- **Passed:** ${summary.passedSymbols}`, `- **Failed:** ${summary.failedSymbols}`, `- **Warnings:** ${summary.warningSymbols}`, '');

  results.push('## Universe Composition', '');
  results.push('| # | Symbol | Sector | Market Cap (₹cr) | Risk | Rationale |');
  results.push('|---|--------|--------|-------------------|------|-----------|');
  TEST_UNIVERSE.forEach((e, i) => {
    results.push(`| ${i + 1} | ${e.symbol} | ${e.sector} | ${e.marketCap.toLocaleString('en-IN')} | ${e.riskProfile} | ${e.rationale} |`);
  });

  results.push('', '## Sector Distribution', '');
  const sectorCounts: Record<string, number> = {};
  TEST_UNIVERSE.forEach(e => { sectorCounts[e.sector] = (sectorCounts[e.sector] || 0) + 1; });
  Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).forEach(([sector, count]) => {
    results.push(`- ${sector}: ${count} symbols`);
  });

  results.push('', '## Risk Profile Distribution', '');
  const riskCounts: Record<string, number> = {};
  TEST_UNIVERSE.forEach(e => { riskCounts[e.riskProfile] = (riskCounts[e.riskProfile] || 0) + 1; });
  Object.entries(riskCounts).forEach(([risk, count]) => {
    results.push(`- ${risk}: ${count} symbols`);
  });

  results.push('', '## Market Cap Distribution', '');
  results.push(`- Mega (>₹5,00,000cr): ${TEST_UNIVERSE.filter(e => e.marketCap > 500000).length}`);
  results.push(`- Large (₹1,00,000–₹5,00,000cr): ${TEST_UNIVERSE.filter(e => e.marketCap >= 100000 && e.marketCap <= 500000).length}`);
  results.push(`- Mid (₹20,000–₹1,00,000cr): ${TEST_UNIVERSE.filter(e => e.marketCap < 100000).length}`);

  // Write report
  const reportPath = path.join(REPORTS_DIR, '03-market-universe-test-set.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`\n✅ Universe built: ${TEST_UNIVERSE.length} symbols across ${Object.keys(sectorCounts).length} sectors`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
