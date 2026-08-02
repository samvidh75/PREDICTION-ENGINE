#!/usr/bin/env npx tsx
/**
 * calibrate-risk-radar.ts — Phase 7
 * Audits the risk radar calibration against the test universe,
 * verifying that risk scores, sector adjustments, and market-cap
 * risk premia are correctly calibrated.
 *
 * Usage: npx tsx scripts/intelligence/calibrate-risk-radar.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { RiskCalibrator } from '../../src/stockstory/intelligence/calibration/RiskCalibrator';

const REPORTS_DIR = path.resolve('reports/intelligence');
const calibrator = new RiskCalibrator();

interface RiskTestEntry {
  symbol: string;
  sector: string;
  marketCapCr: number;
  debtToEquity: number;
  beta: number;
  promoterHolding: number;
  fiiHolding: number;
  customerConcentration: number;
  pledgePercent: number;
  opportunityClass: string;
}

const RISK_TEST_SET: RiskTestEntry[] = [
  // Low risk
  { symbol: 'TCS', sector: 'IT Services', marketCapCr: 1500000, debtToEquity: 0.05, beta: 0.6, promoterHolding: 72, fiiHolding: 13, customerConcentration: 0, pledgePercent: 0, opportunityClass: 'compounder' },
  { symbol: 'HINDUNILVR', sector: 'FMCG', marketCapCr: 600000, debtToEquity: 0.0, beta: 0.5, promoterHolding: 62, fiiHolding: 14, customerConcentration: 0, pledgePercent: 0, opportunityClass: 'defensive' },
  // Moderate risk
  { symbol: 'MARUTI', sector: 'Automobile', marketCapCr: 350000, debtToEquity: 0.1, beta: 0.9, promoterHolding: 57, fiiHolding: 20, customerConcentration: 0, pledgePercent: 0, opportunityClass: 'growth_at_reasonable_price' },
  { symbol: 'SBIN', sector: 'Banking', marketCapCr: 550000, debtToEquity: 0.15, beta: 1.1, promoterHolding: 57, fiiHolding: 10, customerConcentration: 0, pledgePercent: 0, opportunityClass: 'dividend_yield' },
  // High risk
  { symbol: 'TATAMOTORS', sector: 'Automobile', marketCapCr: 280000, debtToEquity: 1.8, beta: 1.3, promoterHolding: 42, fiiHolding: 18, customerConcentration: 0, pledgePercent: 5, opportunityClass: 'cyclical_play' },
  { symbol: 'JSWSTEEL', sector: 'Steel', marketCapCr: 200000, debtToEquity: 1.5, beta: 1.4, promoterHolding: 45, fiiHolding: 15, customerConcentration: 0, pledgePercent: 10, opportunityClass: 'value_play' },
  { symbol: 'ADANIENT', sector: 'Diversified', marketCapCr: 350000, debtToEquity: 2.5, beta: 1.5, promoterHolding: 73, fiiHolding: 15, customerConcentration: 0, pledgePercent: 40, opportunityClass: 'special_situation' },
  // Emerging
  { symbol: 'ZOMATO', sector: 'Internet', marketCapCr: 150000, debtToEquity: 0.1, beta: 1.2, promoterHolding: 0, fiiHolding: 55, customerConcentration: 20, pledgePercent: 0, opportunityClass: 'emerging_leader' },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 7 — Risk Radar Calibration Audit               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Risk Radar Calibration Audit', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Test Symbols:** ${RISK_TEST_SET.length}`, '');

  results.push('## Risk Profile Analysis', '');
  results.push('| Symbol | Sector | Overall Risk | Financial | Market | Concentr. | Governance | Category | Adjusted | Acceptable? |');
  results.push('|--------|--------|-------------|-----------|--------|-----------|------------|----------|----------|-------------|');

  for (const entry of RISK_TEST_SET) {
    const profile = calibrator.computeRiskProfile({
      symbol: entry.symbol,
      sector: entry.sector,
      marketCapCr: entry.marketCapCr,
      debtToEquity: entry.debtToEquity,
      beta: entry.beta,
      promoterHolding: entry.promoterHolding,
      fiiHolding: entry.fiiHolding,
      customerConcentration: entry.customerConcentration,
      pledgePercent: entry.pledgePercent,
    });

    const adjusted = calibrator.adjustRisk(profile.overallRisk, entry.sector, entry.marketCapCr);
    const acceptable = calibrator.isRiskAcceptable(adjusted.adjustedRisk, entry.opportunityClass);

    results.push(
      `| ${entry.symbol} | ${entry.sector} | ${profile.overallRisk.toFixed(2)} | ${profile.financialRisk.toFixed(2)} | ${profile.marketRisk.toFixed(2)} | ${profile.concentrationRisk.toFixed(2)} | ${profile.governanceRisk.toFixed(2)} | ${profile.category} | ${adjusted.adjustedRisk.toFixed(2)} | ${acceptable ? '✅' : '❌'} |`,
    );
  }

  results.push('', '## Sector Risk Adjustments', '');
  const sectors = [...new Set(RISK_TEST_SET.map(e => e.sector))];
  results.push('| Sector | Raw Risk | Adj Risk | Sector Mult | Cap Mult |');
  results.push('|--------|----------|----------|-------------|----------|');

  for (const sector of sectors) {
    const entry = RISK_TEST_SET.find(e => e.sector === sector)!;
    const profile = calibrator.computeRiskProfile({
      symbol: entry.symbol, sector, marketCapCr: entry.marketCapCr,
      debtToEquity: entry.debtToEquity, beta: entry.beta,
      promoterHolding: entry.promoterHolding, fiiHolding: entry.fiiHolding,
      customerConcentration: entry.customerConcentration, pledgePercent: entry.pledgePercent,
    });
    const adj = calibrator.adjustRisk(profile.overallRisk, sector, entry.marketCapCr);
    results.push(`| ${sector} | ${profile.overallRisk.toFixed(2)} | ${adj.adjustedRisk.toFixed(2)} | ${adj.sectorMultiplier.toFixed(2)}x | ${adj.marketCapMultiplier.toFixed(2)}x |`);
  }

  const reportPath = path.join(REPORTS_DIR, '07-risk-radar-calibration.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Risk radar audit complete: ${RISK_TEST_SET.length} symbols tested`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
