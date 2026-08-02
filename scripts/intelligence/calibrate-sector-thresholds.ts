#!/usr/bin/env npx tsx
/**
 * calibrate-sector-thresholds.ts — Phase 4
 * Audits and calibrates sector-specific scoring thresholds
 * (PE, PB, D/E, growth) against current Indian market realities.
 *
 * Usage: npx tsx scripts/intelligence/calibrate-sector-thresholds.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_CALIBRATION, type SectorCalibration } from '../../src/stockstory/intelligence/calibration/CalibrationTypes';
import { SectorCalibrationEngine } from '../../src/stockstory/intelligence/calibration/SectorCalibrationEngine';

const REPORTS_DIR = path.resolve('reports/intelligence');
const engine = new SectorCalibrationEngine(DEFAULT_CALIBRATION);

interface SectorAuditEntry {
  sector: string;
  peRange: string;
  pbRange: string;
  maxDte: number;
  qualityMultiplier: number;
  keyMetrics: string;
  factorWeights: string;
  status: 'active' | 'review';
  notes: string;
}

function auditSector(name: string, cal: SectorCalibration): SectorAuditEntry {
  const warnings: string[] = [];
  if (cal.peRange.max > 50) warnings.push('High PE ceiling — verify for cyclical sectors');
  if (cal.pbRange.max > 8) warnings.push('High PB ceiling — verify for asset-light sectors');
  if (cal.maxDebtToEquity > 2.0) warnings.push('High D/E tolerance — flag for capital-intensive sectors');
  if (cal.qualityMultiplier > 1.2) warnings.push('Quality multiplier >1.2 — verify justification');
  if (cal.qualityMultiplier < 0.8) warnings.push('Quality multiplier <0.8 — ensure not penalizing unfairly');

  return {
    sector: name,
    peRange: `${cal.peRange.min}–${cal.peRange.max}`,
    pbRange: `${cal.pbRange.min}–${cal.pbRange.max}`,
    maxDte: cal.maxDebtToEquity,
    qualityMultiplier: cal.qualityMultiplier,
    keyMetrics: cal.keyMetrics.join(', '),
    factorWeights: Object.entries(cal.factorWeights).map(([k, v]) => `${k}:${v}`).join(' | '),
    status: warnings.length > 0 ? 'review' : 'active',
    notes: warnings.length > 0 ? warnings.join('; ') : 'Calibration within normal ranges',
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 4 — Sector Calibration Audit                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Sector Calibration Audit', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Sectors Calibrated:** ${Object.keys(DEFAULT_CALIBRATION.sectorOverrides).length}`, '');

  // Audit each sector
  const entries: SectorAuditEntry[] = [];
  const allSectors = [...Object.keys(DEFAULT_CALIBRATION.sectorOverrides), 'Default'];

  for (const sector of allSectors) {
    const cal = engine.getSectorCalibration(sector);
    entries.push(auditSector(sector, cal));
  }

  results.push('## Sector Thresholds', '');
  results.push('| Sector | PE Range | PB Range | Max D/E | Q-Mult | Key Metrics | Factor Weights | Status |');
  results.push('|--------|----------|----------|---------|--------|-------------|----------------|--------|');

  for (const e of entries) {
    results.push(`| ${e.sector} | ${e.peRange} | ${e.pbRange} | ${e.maxDte} | ${e.qualityMultiplier} | ${e.keyMetrics} | ${e.factorWeights} | ${e.status} |`);
  }

  results.push('', '## Review Items', '');
  const reviewItems = entries.filter(e => e.status === 'review');
  if (reviewItems.length === 0) {
    results.push('✅ All sector calibrations pass sanity checks.');
  } else {
    for (const item of reviewItems) {
      results.push(`### ${item.sector}`, `- **Notes:** ${item.notes}`, '');
    }
  }

  // Test validation symbols
  results.push('## Test Symbol Validation', '');
  const testSymbols = ['RELIANCE', 'TCS', 'HDFCBANK', 'ITC', 'TATAMOTORS'];
  results.push('| Symbol | Sector | PE Range Valid? | PB Range Valid? | D/E Acceptable? |');
  results.push('|--------|--------|-----------------|-----------------|-----------------|');

  for (const sym of testSymbols) {
    const sector = ['Oil & Gas', 'IT Services', 'Banking', 'FMCG', 'Automobile'][testSymbols.indexOf(sym)];
    const testPE = [22, 30, 18, 25, 15][testSymbols.indexOf(sym)];
    const testPB = [2.5, 8.0, 3.0, 10.0, 2.0][testSymbols.indexOf(sym)];
    const testDTE = [0.8, 0.1, 0.15, 0.0, 1.8][testSymbols.indexOf(sym)];

    results.push(`| ${sym} | ${sector} | ${engine.isPERangeValid(sector, testPE) ? '✅' : '❌'} | ${engine.isPBRangeValid(sector, testPB) ? '✅' : '❌'} | ${engine.isDebtAcceptable(sector, testDTE) ? '✅' : '❌'} |`);
  }

  const reportPath = path.join(REPORTS_DIR, '04-sector-calibration-audit.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Sector audit complete: ${entries.length} sectors, ${reviewItems.length} need review`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
