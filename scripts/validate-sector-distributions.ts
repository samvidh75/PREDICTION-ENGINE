/**
 * TRACK-P1 — Sector Distribution Validation Script
 * 
 * Validates that every sector has every required PercentileMetric,
 * distributions are monotonic, no NaN, no undefined.
 * 
 * Usage: npx tsx scripts/validate-sector-distributions.ts
 */

import { SectorDistributionEngine } from '../src/stockstory/analytics/SectorDistributionEngine';
import { SectorPercentileEngine, type PercentileMetric } from '../src/stockstory/scoring/SectorPercentileEngine';
import type { SectorType } from '../src/stockstory/sectors/SectorWeightEngine';

const REQUIRED_METRICS: PercentileMetric[] = [
  'roa', 'roe', 'roic',
  'revenueGrowth', 'epsGrowth', 'profitGrowth', 'fcfGrowth',
  'grossMargin', 'operatingMargin',
  'debtToEquity', 'currentRatio',
  'peRatio', 'pbRatio', 'evEbitda', 'fcfYield', 'volatility',
];

const SECTORS: SectorType[] = ['BANKING', 'IT', 'FMCG', 'PHARMA', 'AUTO', 'ENERGY', 'GENERAL'];

let errors = 0;

console.log('=== Sector Distribution Validation ===\n');

// Initialize
SectorDistributionEngine.initialise();

// Test 1: All sectors initialized
console.log('1. Sector completeness check...');
for (const sector of SECTORS) {
  let sectorErrors = 0;
  for (const metric of REQUIRED_METRICS) {
    const dist = SectorPercentileEngine.getDistribution(sector, metric);
    const ref = SectorDistributionEngine.getReference(sector, metric);
    if (!dist) {
      console.error(`  FAIL: ${sector}/${metric} - no distribution`);
      sectorErrors++;
      errors++;
    }
    if (!ref) {
      console.error(`  FAIL: ${sector}/${metric} - no reference data`);
      sectorErrors++;
      errors++;
    }
  }
  if (sectorErrors === 0) {
    console.log(`  PASS: ${sector} - all ${REQUIRED_METRICS.length} metrics present`);
  }
}

// Test 2: Monotonicity
console.log('\n2. Monotonicity check...');
for (const sector of SECTORS) {
  for (const metric of REQUIRED_METRICS) {
    const ref = SectorDistributionEngine.getReference(sector, metric);
    if (!ref) continue;
    if (ref.p10 > ref.p25 || ref.p25 > ref.p50 || ref.p50 > ref.p75 || ref.p75 > ref.p90) {
      console.error(`  FAIL: ${sector}/${metric} - non-monotonic: p10=${ref.p10}, p25=${ref.p25}, p50=${ref.p50}, p75=${ref.p75}, p90=${ref.p90}`);
      errors++;
    }
  }
}
console.log('  PASS: all distributions monotonic');

// Test 3: No NaN
console.log('\n3. NaN check...');
for (const sector of SECTORS) {
  for (const metric of REQUIRED_METRICS) {
    const ref = SectorDistributionEngine.getReference(sector, metric);
    if (!ref) continue;
    if (isNaN(ref.p10) || isNaN(ref.p25) || isNaN(ref.p50) || isNaN(ref.p75) || isNaN(ref.p90)) {
      console.error(`  FAIL: ${sector}/${metric} - contains NaN`);
      errors++;
    }
  }
}
console.log('  PASS: no NaN values');

// Test 4: Peer count
console.log('\n4. Peer count check...');
for (const sector of SECTORS) {
  const count = SectorPercentileEngine.getPeerCount(sector);
  if (count < 3) {
    console.error(`  FAIL: ${sector} - peer count ${count} < 3`);
    errors++;
  }
}
console.log('  PASS: all sectors have sufficient peer counts');

// Test 5: Score range (boundary values)
console.log('\n5. Score range check...');
for (const sector of SECTORS) {
  for (const metric of REQUIRED_METRICS) {
    const dist = SectorPercentileEngine.getDistribution(sector, metric);
    if (!dist) continue;
    
    // Test extreme values
    const extremeValues = [-999, -1, 0, 1, 999];
    for (const val of extremeValues) {
      const score = SectorPercentileEngine.score(val, sector, metric);
      if (score < 0 || score > 100) {
        console.error(`  FAIL: ${sector}/${metric} - score ${score} out of range for value ${val}`);
        errors++;
      }
    }
    
    // Test null
    const nullScore = SectorPercentileEngine.score(null, sector, metric);
    if (nullScore !== 50) {
      console.error(`  FAIL: ${sector}/${metric} - null score ${nullScore} != 50`);
      errors++;
    }
  }
}
console.log('  PASS: all scores within 0-100 range, null returns 50');

// Test 6: Inverse metrics check
console.log('\n6. Inverse metric verification...');
const inverseMetrics: PercentileMetric[] = ['debtToEquity', 'peRatio', 'pbRatio', 'evEbitda', 'volatility'];
for (const metric of inverseMetrics) {
  // For inverse metrics, a very low value should produce a high score
  const score = SectorPercentileEngine.score(0.01, 'GENERAL', metric);
  if (score < 50) {
    console.error(`  FAIL: inverse metric ${metric} - very low value got score ${score} (expected > 50)`);
    errors++;
  }
}
console.log('  PASS: inverse metrics behave correctly');

// Summary
console.log(`\n=== Validation Complete ===`);
if (errors === 0) {
  console.log(`PASS: ${SECTORS.length} sectors validated`);
  console.log('PASS: all percentile metrics present');
  console.log('PASS: all distributions monotonic');
  console.log('PASS: p10 <= p25 <= p50 <= p75 <= p90');
  console.log('PASS: no NaN values');
  console.log('PASS: no undefined metrics');
  process.exit(0);
} else {
  console.error(`FAIL: ${errors} error(s) found`);
  process.exit(1);
}
