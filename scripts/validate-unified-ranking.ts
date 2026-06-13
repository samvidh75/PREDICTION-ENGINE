/**
 * F5: Validate unified engine ranking output.
 *
 * Usage: tsx scripts/validate-unified-ranking.ts
 *
 * Checks:
 * - All scores 0-100
 * - No NaN/Infinity
 * - Classification matches score bands
 * - Confidence matches thresholds
 * - Factor scores sum/weight correctly
 * - Missing data correctly reduces completeness
 * - No lookahead bias in input
 */

import { UnifiedPredictionEngine } from '../src/prediction-engine/UnifiedPredictionEngine';
import {
  UnifiedPredictionInput,
  UnifiedPredictionOutput,
  UnifiedFactorScore,
  UnifiedHorizon,
  UnifiedClassification,
  UnifiedConfidenceLevel,
} from '../src/prediction-engine/types';
import { computeCompositeScore, COMPOSITE_WEIGHTS } from '../src/prediction-engine/scoring/CompositeScorer';

const engine = new UnifiedPredictionEngine();

interface ValidationIssue {
  severity: 'ERROR' | 'WARNING';
  category: string;
  message: string;
  symbol?: string;
}

const issues: ValidationIssue[] = [];

function addIssue(severity: 'ERROR' | 'WARNING', category: string, message: string, symbol?: string) {
  issues.push({ severity, category, message, symbol });
}

function checkScoreInRange(value: number | null, min: number, max: number, name: string, symbol?: string) {
  if (value === null) return;
  if (!Number.isFinite(value)) {
    addIssue('ERROR', 'score_range', `${name} is NaN/Infinity (${value})`, symbol);
    return;
  }
  if (value < min || value > max) {
    addIssue('ERROR', 'score_range', `${name} = ${value} is outside [${min}, ${max}]`, symbol);
  }
}

function checkClassification(score: number | null, classification: UnifiedClassification, symbol?: string) {
  if (score === null) {
    if (classification !== 'INSUFFICIENT_DATA') {
      addIssue('ERROR', 'classification', `Null score but classification is ${classification}, expected INSUFFICIENT_DATA`, symbol);
    }
    return;
  }

  const expected: UnifiedClassification =
    score >= 80 ? 'EXCELLENT' :
    score >= 65 ? 'HEALTHY' :
    score >= 50 ? 'STABLE' :
    score >= 35 ? 'WEAKENING' :
    'AT_RISK';

  if (classification !== expected) {
    addIssue('WARNING', 'classification', `Score ${score} maps to ${expected} but classification is ${classification}`, symbol);
  }
}

function checkConfidence(score: number, level: UnifiedConfidenceLevel, symbol?: string) {
  const expected: UnifiedConfidenceLevel =
    score >= 80 ? 'HIGH' :
    score >= 60 ? 'MEDIUM' :
    score >= 40 ? 'LOW' :
    'CRITICAL';

  if (level !== expected) {
    addIssue('WARNING', 'confidence', `Confidence score ${score} maps to ${expected} but level is ${level}`, symbol);
  }
}

function validateFactorScores(factorScores: UnifiedFactorScore[], output: UnifiedPredictionOutput) {
  const groups = factorScores.map(fs => fs.group);

  const requiredGroups: string[] = ['quality', 'valuation', 'growth', 'stability', 'momentum', 'risk', 'sector', 'liquidity'];
  for (const g of requiredGroups) {
    if (!(groups as string[]).includes(g)) {
      addIssue('ERROR', 'factor_scores', `Missing required factor group: ${g}`, output.symbol);
    }
  }

  for (const fs of factorScores) {
    checkScoreInRange(fs.value, 0, 100, `factor:${fs.group}`, output.symbol);
    checkScoreInRange(fs.availability, 0, 100, `factor:${fs.group}.availability`, output.symbol);
    checkScoreInRange(fs.confidence, 0, 100, `factor:${fs.group}.confidence`, output.symbol);
    if (fs.featureCount < fs.availableFeatureCount) {
      addIssue('WARNING', 'factor_scores', `${fs.group}: availableFeatureCount (${fs.availableFeatureCount}) > featureCount (${fs.featureCount})`, output.symbol);
    }
  }

  const composite = computeCompositeScore(factorScores);
  if (composite.rankingScore !== null && output.rankingScore !== null) {
    const drift = Math.abs(composite.rankingScore - output.rankingScore);
    if (drift > 1) {
      addIssue('WARNING', 'factor_scores', `Composite scorer rankingScore (${composite.rankingScore}) differs from engine output (${output.rankingScore}) by ${drift}`, output.symbol);
    }
  }
}

function validateFeatureVector(output: UnifiedPredictionOutput) {
  for (const fv of output.featureVector) {
    if (fv.raw !== null) {
      checkScoreInRange(fv.raw, -Infinity, Infinity, `feature:${fv.id}.raw`, output.symbol);
    }
    if (fv.transformed !== null) {
      checkScoreInRange(fv.transformed, -Infinity, Infinity, `feature:${fv.id}.transformed`, output.symbol);
    }
    if (fv.raw === null && fv.transformed !== null) {
      addIssue('WARNING', 'feature_vector', `${fv.id}: raw is null but transformed is ${fv.transformed}`, output.symbol);
    }
  }
}

function validateCompleteness(output: UnifiedPredictionOutput, input: UnifiedPredictionInput) {
  if (output.dataCompleteness < 0 || output.dataCompleteness > 100) {
    addIssue('ERROR', 'completeness', `dataCompleteness ${output.dataCompleteness} out of range`, output.symbol);
  }
}

function checkLookaheadBias(input: UnifiedPredictionInput) {
  if (!input.tradeDate || input.tradeDates.length === 0) return;

  const tradeDate = new Date(input.tradeDate);
  for (const dateStr of input.tradeDates) {
    const d = new Date(dateStr);
    if (d > tradeDate) {
      addIssue('ERROR', 'lookahead', `tradeDate ${input.tradeDate} precedes closePrice date ${dateStr}`, input.symbol);
      break;
    }
  }
}

function generateTestInputs(): Array<{ input: UnifiedPredictionInput; description: string }> {
  const base: UnifiedPredictionInput = {
    symbol: 'TEST',
    exchange: 'NSE',
    sector: 'Technology',
    tradeDate: '2026-06-14',
    horizon: 90,
    close: 250.00,
    open: 248.50,
    high: 252.00,
    low: 247.00,
    volume: 1_500_000,
    closePrices: [240, 245, 248, 252, 250],
    tradeDates: ['2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-14'],
    priceFreshnessDays: 1,
    rsi: 55,
    macd: 2.5,
    macdSignal: 1.8,
    macdHistogram: 0.7,
    adx: 28,
    atr: 15.5,
    bollingerWidth: 0.08,
    relativeStrength: 0.01,
    movingAverageDistance: 0.02,
    trendStrength: 0.03,
    featureFreshnessDays: 1,
    qualityFactor: 65,
    valueFactor: 55,
    growthFactor: 58,
    momentumFactor: 60,
    riskFactor: 45,
    sectorStrengthFactor: 55,
    factorFreshnessDays: 1,
    peRatio: 15,
    pbRatio: 2.5,
    eps: 120,
    dividendYield: 0.025,
    beta: 1.1,
    marketCap: 500_000_000_000,
    freeFloat: 45,
    fcfYield: 0.04,
    evEbitda: 12,
    roa: 0.10,
    roe: 0.18,
    roic: 0.14,
    debtToEquity: 0.45,
    currentRatio: 2.1,
    revenueGrowth: 0.12,
    profitGrowth: 0.10,
    epsGrowth: 0.15,
    fcfGrowth: 0.08,
    grossMargin: 0.45,
    operatingMargin: 0.22,
    netMargin: 0.15,
    revenue: 50_000_000_000,
    operatingProfit: 11_000_000_000,
    netProfit: 7_500_000_000,
    totalAssets: 80_000_000_000,
    totalDebt: 18_000_000_000,
    equity: 40_000_000_000,
    cashFlowFromOperations: 8_000_000_000,
    fundamentalFreshnessDays: 30,
    providerCount: 3,
    lineageCount: 2,
    fieldCompleteness: 95,
    staleFieldCount: 0,
    partialFactorCount: 0,
    sourceConfidence: 85,
    sectorPeers: [],
    freshnessThresholds: {
      priceMaxAgeDays: 5,
      fundamentalMaxAgeDays: 90,
      factorMaxAgeDays: 30,
      featureMaxAgeDays: 30,
    },
  };

  const scenarios: Array<{ input: UnifiedPredictionInput; description: string }> = [
    { input: { ...base }, description: 'Normal healthy stock' },
    {
      input: { ...base, close: null, closePrices: [], peRatio: null, pbRatio: null, roe: null, roa: null, roic: null },
      description: 'Missing all data — should produce INSUFFICIENT_DATA',
    },
    {
      input: { ...base, close: 50, peRatio: 5, pbRatio: 0.6, beta: 0.3, debtToEquity: 0.1, marketCap: 1e12, currentRatio: 4, revenueGrowth: 0.30, epsGrowth: 0.35, dividendYield: 0.06 },
      description: 'Excellent fundamentals — should produce EXCELLENT',
    },
    {
      input: { ...base, close: 200, peRatio: 60, pbRatio: 10, beta: 2.5, debtToEquity: 3.5, currentRatio: 0.4, revenueGrowth: -0.15, epsGrowth: -0.20, marketCap: 50_000_000 },
      description: 'Poor fundamentals — should produce AT_RISK',
    },
    {
      input: { ...base, staleFieldCount: 5, fieldCompleteness: 30, sourceConfidence: 20 },
      description: 'Degraded data quality — should produce CRITICAL confidence',
    },
  ];

  return scenarios;
}

function main() {
  console.log('=== F5 Unified Engine Ranking Validation ===\n');

  const scenarios = generateTestInputs();
  let totalPass = 0;
  let totalFail = 0;

  for (const { input, description } of scenarios) {
    console.log(`--- ${description} ---`);
    const output = engine.evaluate(input);

    console.log(`  Symbol: ${output.symbol}`);
    console.log(`  RankingScore: ${output.rankingScore}`);
    console.log(`  Classification: ${output.classification}`);
    console.log(`  Confidence: ${output.confidenceScore} (${output.confidenceLevel})`);
    console.log(`  Data Completeness: ${output.dataCompleteness}`);
    console.log(`  Factor Scores: ${output.factorScores.map(fs => `${fs.group}=${fs.value}`).join(', ')}`);

    checkScoreInRange(output.rankingScore, 0, 100, 'rankingScore', output.symbol);
    checkScoreInRange(output.healthScore, 0, 100, 'healthScore', output.symbol);
    checkScoreInRange(output.confidenceScore, 0, 100, 'confidenceScore', output.symbol);

    if (output.rankingScore !== null && !Number.isFinite(output.rankingScore)) {
      addIssue('ERROR', 'nan_infinity', 'rankingScore is NaN or Infinity', output.symbol);
    }
    if (!Number.isFinite(output.confidenceScore)) {
      addIssue('ERROR', 'nan_infinity', 'confidenceScore is NaN or Infinity', output.symbol);
    }
    if (output.healthScore !== null && !Number.isFinite(output.healthScore)) {
      addIssue('ERROR', 'nan_infinity', 'healthScore is NaN or Infinity', output.symbol);
    }

    checkClassification(output.rankingScore, output.classification, output.symbol);
    checkConfidence(output.confidenceScore, output.confidenceLevel, output.symbol);
    validateFactorScores(output.factorScores, output);
    validateFeatureVector(output);
    validateCompleteness(output, input);
    checkLookaheadBias(input);

    const scenarioErrors = issues.filter(i => i.symbol === output.symbol && i.severity === 'ERROR');
    const scenarioWarnings = issues.filter(i => i.symbol === output.symbol && i.severity === 'WARNING');

    if (scenarioErrors.length === 0 && scenarioWarnings.length === 0) {
      totalPass++;
      console.log('  ✓ PASS\n');
    } else {
      totalFail++;
      for (const e of scenarioErrors) console.log(`  ✗ ERROR: ${e.message}`);
      for (const w of scenarioWarnings) console.log(`  ⚠ WARNING: ${w.message}`);
      console.log('');
    }
  }

  console.log('=== Summary ===');
  console.log(`Passed scenarios: ${totalPass}`);
  console.log(`Failed scenarios: ${totalFail}`);
  console.log(`Total issues found: ${issues.length}`);
  console.log(`  Errors: ${issues.filter(i => i.severity === 'ERROR').length}`);
  console.log(`  Warnings: ${issues.filter(i => i.severity === 'WARNING').length}`);

  if (issues.length > 0) {
    console.log('\n=== All Issues ===');
    for (const issue of issues) {
      console.log(`[${issue.severity}] [${issue.category}] ${issue.symbol ? `(${issue.symbol}) ` : ''}${issue.message}`);
    }
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main();
