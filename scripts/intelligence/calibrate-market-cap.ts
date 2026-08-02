#!/usr/bin/env npx tsx
/**
 * calibrate-market-cap.ts — Phase 5
 * Audits market-cap bucket calibration (growth expectations,
 * liquidity factors, scoring weights) against Indian market.
 *
 * Usage: npx tsx scripts/intelligence/calibrate-market-cap.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_CALIBRATION, type MarketCapBucket } from '../../src/stockstory/intelligence/calibration/CalibrationTypes';
import { MarketCapCalibrator } from '../../src/stockstory/intelligence/calibration/MarketCapCalibrator';

const REPORTS_DIR = path.resolve('reports/intelligence');
const calibrator = new MarketCapCalibrator(DEFAULT_CALIBRATION);

interface BucketAuditEntry {
  label: string;
  range: string;
  expectedGrowth: string;
  qualityFloor: number;
  liquidityFactor: number;
  scoringWeight: number;
  status: 'active' | 'review';
  notes: string;
}

function auditBucket(bucket: MarketCapBucket): BucketAuditEntry {
  const warnings: string[] = [];
  if (bucket.expectedGrowth.min < -10) warnings.push('Growth floor below -10% — verify for distressed companies');
  if (bucket.expectedGrowth.max > 50) warnings.push('Growth ceiling >50% — unrealistic for large caps');
  if (bucket.liquidityFactor < 0.5) warnings.push('Low liquidity factor — may signal illiquidity premium');
  if (bucket.scoringWeight < 0.15) warnings.push('Low scoring weight — bucket may be underrepresented');

  return {
    label: bucket.label,
    range: `₹${bucket.minCap.toLocaleString('en-IN')}cr – ₹${bucket.maxCap.toLocaleString('en-IN')}cr`,
    expectedGrowth: `${bucket.expectedGrowth.min}% to ${bucket.expectedGrowth.max}%`,
    qualityFloor: bucket.qualityFloor,
    liquidityFactor: bucket.liquidityFactor,
    scoringWeight: bucket.scoringWeight,
    status: warnings.length > 0 ? 'review' : 'active',
    notes: warnings.length > 0 ? warnings.join('; ') : 'Bucket calibration validated',
  };
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 5 — Market Cap Calibration Audit                ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Market Cap Calibration Audit', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Total Buckets:** ${DEFAULT_CALIBRATION.marketCapBuckets.length}`, '');

  const entries = DEFAULT_CALIBRATION.marketCapBuckets.map(auditBucket);

  results.push('## Bucket Configuration', '');
  results.push('| Bucket | Cap Range | Growth Range | Q-Floor | Liquidity | Weight | Status |');
  results.push('|--------|-----------|-------------|---------|-----------|--------|--------|');

  for (const e of entries) {
    results.push(`| ${e.label} | ${e.range} | ${e.expectedGrowth} | ${e.qualityFloor} | ${e.liquidityFactor} | ${e.scoringWeight} | ${e.status} |`);
  }

  results.push('', '## Test Calibrations', '');
  results.push('| Symbol | Market Cap (₹cr) | Bucket | Growth Realistic? | Liquidity Factor |');
  results.push('|--------|-------------------|--------|-------------------|------------------|');

  const tests: Array<{ sym: string; cap: number; growth: number }> = [
    { sym: 'RELIANCE', cap: 2000000, growth: 12 },
    { sym: 'TCS', cap: 1500000, growth: 15 },
    { sym: 'HDFCBANK', cap: 1200000, growth: 18 },
    { sym: 'TATAMOTORS', cap: 280000, growth: 25 },
    { sym: 'ZOMATO', cap: 150000, growth: 45 },
    { sym: 'HAL', cap: 250000, growth: 8 },
  ];

  for (const t of tests) {
    const bucketLabel = calibrator.getBucketLabel(t.cap);
    const realistic = calibrator.isGrowthRealistic(t.cap, t.growth);
    const liq = calibrator.getLiquidityFactor(t.cap);
    results.push(`| ${t.sym} | ${t.cap.toLocaleString('en-IN')} | ${bucketLabel} | ${realistic ? '✅' : '❌'} | ${liq} |`);
  }

  results.push('', '## Review Items', '');
  const reviewItems = entries.filter(e => e.status === 'review');
  if (reviewItems.length === 0) {
    results.push('✅ All market cap buckets pass calibration checks.');
  } else {
    for (const item of reviewItems) {
      results.push(`### ${item.label}`, `- **Notes:** ${item.notes}`, '');
    }
  }

  results.push('', '## Weight Distribution', '');
  const totalWeight = entries.reduce((sum, e) => sum + e.scoringWeight, 0);
  results.push(`- **Total Weight:** ${totalWeight.toFixed(2)} (should sum to ~1.0)`);
  for (const e of entries) {
    results.push(`  - ${e.label}: ${(e.scoringWeight * 100).toFixed(0)}%`);
  }

  const reportPath = path.join(REPORTS_DIR, '05-market-cap-calibration-audit.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Market cap audit complete: ${entries.length} buckets, ${reviewItems.length} need review`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
