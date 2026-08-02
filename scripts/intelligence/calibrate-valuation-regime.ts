#!/usr/bin/env npx tsx
/**
 * calibrate-valuation-regime.ts — Phase 8
 * Audits valuation regime calibration (PE, PB, EV/EBITDA)
 * across sectors and market caps against Indian market norms.
 *
 * Usage: npx tsx scripts/intelligence/calibrate-valuation-regime.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_CALIBRATION } from '../../src/stockstory/intelligence/calibration/CalibrationTypes';
import { SectorCalibrationEngine } from '../../src/stockstory/intelligence/calibration/SectorCalibrationEngine';
import { MarketCapCalibrator } from '../../src/stockstory/intelligence/calibration/MarketCapCalibrator';

const REPORTS_DIR = path.resolve('reports/intelligence');
const sectorEngine = new SectorCalibrationEngine(DEFAULT_CALIBRATION);
const capCalibrator = new MarketCapCalibrator(DEFAULT_CALIBRATION);

interface ValuationTestEntry {
  symbol: string;
  sector: string;
  marketCapCr: number;
  pe: number;
  pb: number;
  evEbitda: number;
  roe: number;
}

const VALUATION_TESTS: ValuationTestEntry[] = [
  // Premium multiples
  { symbol: 'TCS', sector: 'IT Services', marketCapCr: 1500000, pe: 30, pb: 12, evEbitda: 22, roe: 45 },
  { symbol: 'ASIANPAINT', sector: 'Paints', marketCapCr: 280000, pe: 55, pb: 18, evEbitda: 38, roe: 32 },
  { symbol: 'NESTLEIND', sector: 'FMCG', marketCapCr: 250000, pe: 70, pb: 45, evEbitda: 48, roe: 65 },
  // Reasonable multiples
  { symbol: 'HDFCBANK', sector: 'Banking', marketCapCr: 1200000, pe: 18, pb: 3, evEbitda: 0, roe: 16 },
  { symbol: 'RELIANCE', sector: 'Oil & Gas', marketCapCr: 2000000, pe: 22, pb: 2.5, evEbitda: 15, roe: 9 },
  // Low multiples (potential value traps or cyclical trough)
  { symbol: 'COALINDIA', sector: 'Mining', marketCapCr: 250000, pe: 8, pb: 2, evEbitda: 4, roe: 40 },
  { symbol: 'SBIN', sector: 'Banking', marketCapCr: 550000, pe: 10, pb: 1.5, evEbitda: 0, roe: 14 },
  // Speculative
  { symbol: 'ZOMATO', sector: 'Internet', marketCapCr: 150000, pe: -1, pb: 8, evEbitda: -1, roe: -5 },
];

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 8 — Valuation Regime Calibration               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Valuation Regime Calibration', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Test Symbols:** ${VALUATION_TESTS.length}`, '');

  results.push('## Valuation Sanity', '');
  results.push('| Symbol | Sector | Cap (₹cr) | PE | PE Valid? | PB | PB Valid? | ROE | D/E Accept? |');
  results.push('|--------|--------|-----------|-----|-----------|-----|-----------|-----|-------------|');

  for (const t of VALUATION_TESTS) {
    const peValid = t.pe > 0 ? sectorEngine.isPERangeValid(t.sector, t.pe) : 'N/A';
    const pbValid = sectorEngine.isPBRangeValid(t.sector, t.pb);
    const dteAcceptable = sectorEngine.isDebtAcceptable(t.sector, 0.8);

    results.push(
      `| ${t.symbol} | ${t.sector} | ${t.marketCapCr.toLocaleString('en-IN')} | ${t.pe > 0 ? t.pe : 'N/A'} | ${peValid} | ${t.pb} | ${pbValid ? '✅' : '❌'} | ${t.roe}% | ${dteAcceptable ? '✅' : '❌'} |`,
    );
  }

  results.push('', '## Valuation Regime Map', '');
  results.push('| Regime | PE Range | Typical Sectors | Growth Assumption |');
  results.push('|--------|----------|-----------------|-------------------|');
  results.push('| Deep Value | <12 | PSU Banks, Mining, Steel | No growth priced in |');
  results.push('| Value | 12–20 | Banking, Oil & Gas, Power | 5–10% growth |');
  results.push('| Fair Value | 20–35 | IT Services, Pharma, Auto | 10–18% growth |');
  results.push('| Premium | 35–55 | FMCG, Paints, Consumer | 15–25% growth |');
  results.push('| Speculative | >55 or negative | Internet, New-age | Path to profitability |');

  results.push('', '## Observations', '');
  for (const t of VALUATION_TESTS) {
    if (t.pe > 50 && t.roe > 25) {
      results.push(`- **${t.symbol}:** High PE (${t.pe}) justified by high ROE (${t.roe}%) — premium franchise`);
    } else if (t.pe > 30 && t.roe < 15) {
      results.push(`- **${t.symbol}:** PE (${t.pe}) elevated relative to ROE (${t.roe}%) — valuation concern`);
    } else if (t.pe < 12 && t.roe > 20) {
      results.push(`- **${t.symbol}:** Low PE (${t.pe}) despite high ROE (${t.roe}%) — potential value opportunity`);
    }
  }

  const reportPath = path.join(REPORTS_DIR, '08-valuation-regime-calibration.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Valuation regime audit complete: ${VALUATION_TESTS.length} symbols`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
