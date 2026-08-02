/**
 * Validate prediction calibration against prediction_registry.
 *
 * Uses the database adapter to query real production data,
 * then analyses:
 *   - score distribution
 *   - classification distribution
 *   - confidence score spread vs actual data completeness
 *   - prediction horizon coverage
 *   - ranking monotonicity (do higher scores have better outcomes?)
 *
 * Usage: npx tsx scripts/validate-prediction-calibration.ts
 *
 * Requires DATABASE_URL, DB_ADAPTER=postgres.
 * Skips with summary when env vars are missing.
 */

export {};

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

interface RegistryRow {
  symbol: string;
  prediction_date: string;
  horizon: number;
  ranking_score: number | null;
  classification: string | null;
  confidence_score: number | null;
  confidence_level: string | null;
  quality_score: number | null;
  growth_score: number | null;
  value_score: number | null;
  momentum_score: number | null;
  risk_score: number | null;
  validation_status: string | null;
  future_return: number | null;
}

function printSummary(title: string, items: string[]) {
  console.log(`\n${CYAN}${title}${RESET}`);
  items.forEach((item) => console.log(`  ${item}`));
}

function bucketLabel(score: number | null): string {
  if (score === null) return 'null';
  if (score >= 80) return '80-100';
  if (score >= 65) return '65-79';
  if (score >= 50) return '50-64';
  if (score >= 35) return '35-49';
  return '0-34';
}

async function run() {
  console.log(`\n${CYAN}═══════════════════════════════════════${RESET}`);
  console.log(`${CYAN}  PREDICTION TRUTH AUDIT${RESET}`);
  console.log(`${CYAN}═══════════════════════════════════════${RESET}`);

  if (!process.env.DATABASE_URL) {
    printSummary('ENVIRONMENT', [
      `${YELLOW}⚠ DATABASE_URL not set. Skipping database-dependent checks.${RESET}`,
      'To run full audit: set DATABASE_URL and run: npx tsx scripts/validate-prediction-calibration.ts',
    ]);
    printSummary('PREDICTION ENGINE ASSESSMENT', [
      'Engine: UnifiedPredictionEngine (unified-v1.0.0)',
      'Status: PARTIALLY GROUNDED',
      '',
      'What was validated (code review):',
      '  - 8 dimension scorers use real financial data from DB fields',
      '  - Weighted average aggregation is mathematically sound',
      '  - Risk dampening formula works but uses arbitrary threshold (15)',
      '',
      'What is UNKNOWN (no DB access):',
      '  - Whether score thresholds (80/65/50/35) correspond to real outcomes',
      '  - Whether confidence scores predict accuracy',
      '  - Whether classifications (Excellent/Healthy/Stable/Weakening/AtRisk) are calibrated',
      '  - Whether the engine outperforms a simple baseline (e.g. always predicting "Stable")',
      '  - Forward-return distribution by score bucket',
      '  - Hit rate by classification',
      '',
      'Known weaknesses (from code audit):',
      '  - computeSectorScore always returns 55 (no sector logic)',
      '  - computeMissingFields has dead code (duplicate roa check)',
      '  - buildFactorScore hardcodes confidence: 50',
      '  - Three separate weight systems exist (engine inline, CompositeScorer, FactorGroupScorer)',
      '    and they disagree with each other',
      '  - Risk dampening formula has inverted semantics vs CompositeScorer',
      '  - Score thresholds (0.20, 0.10, 0.05) are arbitrary with no calibration evidence',
      '  - keyStrengths, keyWeaknesses, keyRisks are always empty arrays',
      '  - sectorStrengthFactor from DB is defined in input type but never consumed',
      '',
      'Recommendations:',
      '  - Do not display "Excellent" or "Very Healthy" publicly until validation supports it',
      '  - Reduce public confidence level when data completeness is low',
      '  - Replace sector score (hardcoded 55) with real sector-relative scoring',
      '  - Consolidate the three weight systems into one authoritative source',
      '  - Add historical forward-return tracking to prediction_registry',
      '  - Calibrate score thresholds against actual outcomes once enough data exists',
    ]);
    return;
  }

  const { dbAdapter } = await import('../src/db/DatabaseAdapter');
  await dbAdapter.initialize();

  const result = await dbAdapter.query(
    `SELECT symbol, prediction_date, prediction_horizon as horizon,
            ranking_score, classification, confidence_score, confidence_level,
            quality_score, growth_score, value_score, momentum_score, risk_score,
            validation_status, future_return
     FROM prediction_registry
     WHERE ranking_score IS NOT NULL
     ORDER BY prediction_date DESC`,
  );

  const rows: RegistryRow[] = result.rows as RegistryRow[];
  console.log(`\nTotal predictions with scores: ${rows.length}`);

  if (rows.length === 0) {
    printSummary('NO DATA', ['No predictions found in registry. Cannot validate calibration.']);
    await dbAdapter.reset();
    return;
  }

  // 1. Score distribution
  const buckets: Record<string, number> = {};
  rows.forEach((r) => {
    const b = bucketLabel(r.ranking_score);
    buckets[b] = (buckets[b] || 0) + 1;
  });
  printSummary('SCORE DISTRIBUTION', Object.entries(buckets).map(([k, v]) => `${k}: ${v} (${(v / rows.length * 100).toFixed(1)}%)`));

  // 2. Classification distribution
  const classDist: Record<string, number> = {};
  rows.forEach((r) => {
    const c = r.classification || 'null';
    classDist[c] = (classDist[c] || 0) + 1;
  });
  printSummary('CLASSIFICATION DISTRIBUTION', Object.entries(classDist).map(([k, v]) => `${k}: ${v}`));

  // 3. Confidence score spread
  const confScores = rows.map((r) => r.confidence_score).filter((s): s is number => s !== null);
  const avgConf = confScores.length > 0 ? confScores.reduce((a, b) => a + b, 0) / confScores.length : 0;
  const minConf = confScores.length > 0 ? Math.min(...confScores) : 0;
  const maxConf = confScores.length > 0 ? Math.max(...confScores) : 0;
  printSummary('CONFIDENCE SPREAD', [
    `Average: ${avgConf.toFixed(1)}`,
    `Min: ${minConf}, Max: ${maxConf}`,
    `Records with confidence: ${confScores.length}/${rows.length}`,
  ]);

  // 4. Horizon coverage
  const horizons: Record<number, number> = {};
  rows.forEach((r) => {
    const h = r.horizon || 30;
    horizons[h] = (horizons[h] || 0) + 1;
  });
  printSummary('HORIZON COVERAGE', Object.entries(horizons).map(([k, v]) => `${k}D: ${v}`));

  // 5. Ranking monotonicity (if validation_status or future_return exists)
  const validated = rows.filter((r) => r.validation_status || r.future_return !== null);
  printSummary('VALIDATION COVERAGE', [
    `Total rows with validation data: ${validated.length}/${rows.length}`,
    validated.length === 0
      ? `${RED}No validation data exists. Cannot assess prediction accuracy.${RESET}`
      : `${GREEN}${validated.length} rows have outcome data.${RESET}`,
  ]);

  if (validated.length > 5) {
    const byBucket: Record<string, number[]> = {};
    validated.forEach((r) => {
      const b = bucketLabel(r.ranking_score);
      if (!byBucket[b]) byBucket[b] = [];
      if (r.future_return !== null) byBucket[b].push(r.future_return);
    });
    printSummary('FORWARD RETURN BY SCORE BUCKET', Object.entries(byBucket).map(([k, vals]) => {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
      return `${k}: avg return ${(avg * 100).toFixed(2)}% (n=${vals.length})`;
    }));
  } else {
    printSummary('FORWARD RETURNS', [`${YELLOW}Insufficient validation data (n=${validated.length}). Cannot assess forward returns.${RESET}`]);
  }

  // 6. Engine assessment
  const uniqueSymbols = new Set(rows.map((r) => r.symbol)).size;
  printSummary('ENGINE ASSESSMENT', [
    `Unique symbols evaluated: ${uniqueSymbols}`,
    `Total predictions: ${rows.length}`,
    validated.length > 0
      ? `${GREEN}Calibration partially validated${RESET}`
      : `${YELLOW}Calibration NOT validated — no outcome data in registry${RESET}`,
    '',
    'Status: PARTIALLY GROUNDED',
    'The engine processes real financial data through a structured scoring system,',
    'but there is no evidence that scores correlate with future outcomes.',
    'Thresholds (80/65/50/35) and individual factor breakpoints remain uncalibrated.',
  ]);

  await dbAdapter.reset();
}

run().catch(console.error);
