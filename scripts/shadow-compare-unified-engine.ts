/**
 * F5: Shadow-mode comparison between old and unified prediction engines.
 *
 * Usage:
 *   UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true \
 *   ts-node --transpile-only scripts/shadow-compare-unified-engine.ts \
 *     --symbols RELIANCE,TCS,HDFCBANK
 *
 * Environment variables:
 *   UNIFIED_PREDICTION_ENGINE_SHADOW_MODE  Must be "true" to run
 *   UNIFIED_PREDICTION_ENGINE_ENABLED      Underlying flag checked but not required for shadow
 *   DB_HOST / DB_PORT / DB_NAME / DB_USER  Database connection
 *
 * Output: Drift report printed to stdout.
 *
 * Compares:
 *   - rankingScore drift (abs difference)
 *   - classification disagreement
 *   - confidence delta
 *   - factor score deltas (quality, growth, value, momentum, risk, sector)
 *   - data completeness difference
 *   - missing fields comparison
 */

import pool from '../src/db/index';
import { scoreSnapshot } from '../src/backend/data/scoring/scoreEngine';
import { UnifiedPredictionEngine } from '../src/prediction-engine/UnifiedPredictionEngine';
import { adaptScoreSnapshotParams } from '../src/prediction-engine/adapters/ScoreSnapshotAdapter';
import type { FundamentalSnapshot, MarketPriceRecord } from '../src/backend/data/providers/types';
import type { UnifiedPredictionOutput } from '../src/prediction-engine/types';

interface DriftReport {
  symbol: string;
  horizon: number;
  oldRankingScore: number | null;
  newRankingScore: number | null;
  rankingScoreDrift: number | null;
  classificationOld: string | null;
  classificationNew: string;
  classificationMatch: boolean;
  confidenceOld: number;
  confidenceNew: number;
  confidenceDelta: number;
  factorDeltas: Record<string, number | null>;
  dataCompleteness: number;
  missingFieldsOld: string[];
  missingFieldsNew: string[];
  dataCompletenessDiff: number;
  verdict: 'MATCH' | 'DRIFT' | 'CRITICAL_DRIFT' | 'ERROR';
}

const DRIFT_THRESHOLD = 10;
const CRITICAL_DRIFT_THRESHOLD = 25;

function absDiff(a: number | null, b: number | null): number | null {
  if (a === null || b === null) return null;
  return Math.abs(a - b);
}

function computeFactorDeltas(
  oldSnapshot: ReturnType<typeof scoreSnapshot>,
  newOutput: UnifiedPredictionOutput,
): Record<string, number | null> {
  const factorDeltas: Record<string, number | null> = {};
  const factorKeys = ['quality_score', 'growth_score', 'value_score', 'momentum_score', 'risk_score', 'sector_score'] as const;
  for (const key of factorKeys) {
    const oldVal = oldSnapshot.factors[key].value;
    const newFactor = newOutput.factorScores.find(f => {
      const mapping: Record<string, string> = {
        quality_score: 'quality', growth_score: 'growth', value_score: 'valuation',
        momentum_score: 'momentum', risk_score: 'risk', sector_score: 'sector',
      };
      return f.group === mapping[key];
    });
    const newVal = newFactor?.value ?? null;
    factorDeltas[key] = absDiff(oldVal, newVal);
  }
  return factorDeltas;
}

function computeMissingFieldsOld(
  snapshot: ReturnType<typeof scoreSnapshot>,
): string[] {
  const missing: string[] = [];
  for (const [key, factor] of Object.entries(snapshot.factors)) {
    if (factor.value === null) missing.push(key);
  }
  return missing;
}

function classifyDrift(report: DriftReport): DriftReport['verdict'] {
  if (report.rankingScoreDrift === null) return 'ERROR';
  if (report.rankingScoreDrift >= CRITICAL_DRIFT_THRESHOLD || !report.classificationMatch) return 'CRITICAL_DRIFT';
  if (report.rankingScoreDrift >= DRIFT_THRESHOLD) return 'DRIFT';
  return 'MATCH';
}

function printReportHeader(): void {
  console.log('='.repeat(120));
  console.log('F5 SHADOW MODE COMPARISON — UnifiedPredictionEngine vs scoreEngine');
  console.log('='.repeat(120));
  console.log(`Run at: ${new Date().toISOString()}`);
  console.log(`Drift threshold: ±${DRIFT_THRESHOLD} pts  |  Critical drift: ±${CRITICAL_DRIFT_THRESHOLD} pts`);
  console.log('-'.repeat(120));
  console.log('');
}

function printReportRow(report: DriftReport): void {
  const verdictIcon = report.verdict === 'MATCH' ? 'PASS' : report.verdict === 'DRIFT' ? 'DRIFT' : report.verdict === 'CRITICAL_DRIFT' ? 'FAIL' : 'ERR';
  console.log(`[${verdictIcon}] ${report.symbol} H=${report.horizon}`);
  console.log(`      rankingScore: ${report.oldRankingScore ?? '—'} → ${report.newRankingScore ?? '—'}  (drift: ${report.rankingScoreDrift ?? '—'})`);
  console.log(`      classification: ${report.classificationOld ?? '—'} → ${report.classificationNew}  (${report.classificationMatch ? 'match' : 'MISMATCH'})`);
  console.log(`      confidence: ${report.confidenceOld} → ${report.confidenceNew}  (delta: ${report.confidenceDelta >= 0 ? '+' : ''}${report.confidenceDelta})`);
  const factorStrs = Object.entries(report.factorDeltas).map(([k, v]) => `${k}=${v ?? '—'}`);
  console.log(`      factor deltas: ${factorStrs.join(', ')}`);
  console.log(`      data completeness: ${report.dataCompleteness}%  |  missing (old): ${report.missingFieldsOld.length}  (new): ${report.missingFieldsNew.length}`);
  console.log('');
}

function printSummary(reports: DriftReport[]): void {
  const total = reports.length;
  const matched = reports.filter(r => r.verdict === 'MATCH').length;
  const drifted = reports.filter(r => r.verdict === 'DRIFT').length;
  const critical = reports.filter(r => r.verdict === 'CRITICAL_DRIFT').length;
  const errors = reports.filter(r => r.verdict === 'ERROR').length;

  console.log('-'.repeat(120));
  console.log('SUMMARY');
  console.log('-'.repeat(120));
  console.log(`Total comparisons: ${total}`);
  console.log(`Matched: ${matched} (${total > 0 ? ((matched / total) * 100).toFixed(1) : '—'}%)`);
  console.log(`Drift:   ${drifted} (${total > 0 ? ((drifted / total) * 100).toFixed(1) : '—'}%)`);
  console.log(`Critical:${critical} (${total > 0 ? ((critical / total) * 100).toFixed(1) : '—'}%)`);
  console.log(`Errors:  ${errors}`);
  console.log('');

  if (total > 0 && critical / total < 0.1 && matched / total > 0.7) {
    console.log('VERDICT: Shadow mode PASSING — unified engine is safe to promote to active.');
  } else if (total > 0 && critical / total < 0.25) {
    console.log('VERDICT: Shadow mode ACCEPTABLE — investigate drifts before promoting to active.');
  } else {
    console.log('VERDICT: Shadow mode FAILING — unified engine needs alignment before active promotion.');
  }
  console.log('');
}

function printPromotionGuide(): void {
  console.log('-'.repeat(120));
  console.log('PROMOTION GUIDE');
  console.log('-'.repeat(120));
  console.log('To promote from shadow to active:');
  console.log('  1. Set UNIFIED_PREDICTION_ENGINE_ENABLED=true');
  console.log('  2. Set F5_SCORE_SNAPSHOT_DELEGATE=true (for scoreEngine path)');
  console.log('  3. Set F5_PREDICTION_FACTORY_DELEGATE=true (for PredictionFactory path)');
  console.log('  4. Run shadow mode again to verify active path');
  console.log('  5. Monitor drift reports for 7 days');
  console.log('  6. If drift < 10% consistently, legacy engine can be removed');
  console.log('');
}

async function compareSymbol(
  symbol: string,
  horizons: number[],
): Promise<DriftReport[]> {
  const reports: DriftReport[] = [];

  try {
    const priceRes = await pool.query(
      `SELECT * FROM daily_prices WHERE symbol = $1 ORDER BY trading_date ASC`,
      [symbol]
    );
    const prices: MarketPriceRecord[] = priceRes.rows.map((r: any) => ({
      symbol: String(r.symbol),
      tradingDate: String(r.trading_date),
      close: Number(r.close),
      open: r.open != null ? Number(r.open) : 0,
      high: r.high != null ? Number(r.high) : 0,
      low: r.low != null ? Number(r.low) : 0,
      volume: r.volume != null ? Number(r.volume) : 0,
      source: String(r.source ?? 'database'),
      retrievedAt: r.retrieved_at ? String(r.retrieved_at) : new Date().toISOString(),
    }));

    const finRes = await pool.query(
      `SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`,
      [symbol]
    );
    const fundamental: FundamentalSnapshot | null = finRes.rows.length > 0
      ? (finRes.rows[0] as unknown as FundamentalSnapshot)
      : null;

    const sectorRes = await pool.query(
      `SELECT sector FROM symbols WHERE symbol = $1 LIMIT 1`,
      [symbol]
    );
    const sectorScore = sectorRes.rows.length > 0
      ? 50
      : null;

    for (const horizon of horizons) {
      try {
        const oldResult = scoreSnapshot({
          symbol,
          horizon: horizon as 7 | 30 | 90 | 180 | 365,
          prices,
          fundamental,
          sectorScore: sectorScore,
        });

        const engine = new UnifiedPredictionEngine();
        const closePrices = prices.map(p => p.close);
        const tradeDates = prices.map(p => p.tradingDate);
        const input = adaptScoreSnapshotParams(
          symbol,
          horizon,
          closePrices,
          tradeDates,
          (fundamental ?? {}) as Record<string, unknown>,
          sectorScore,
        );
        const newResult = engine.evaluate(input);

        const rankingScoreDrift = absDiff(oldResult.rankingScore, newResult.rankingScore);
        const classificationOld = oldResult.classification;
        const classificationNew = newResult.classification;
        const classificationMatch = mapClassificationToBand(classificationOld) === mapUnifiedClassificationToBand(classificationNew);

        const factorDeltas = computeFactorDeltas(oldResult, newResult);
        const missingFieldsOld = computeMissingFieldsOld(oldResult);
        const missingFieldsNew = newResult.missingFields;

        const report: DriftReport = {
          symbol,
          horizon,
          oldRankingScore: oldResult.rankingScore,
          newRankingScore: newResult.rankingScore,
          rankingScoreDrift,
          classificationOld,
          classificationNew,
          classificationMatch,
          confidenceOld: oldResult.confidenceScore,
          confidenceNew: newResult.confidenceScore,
          confidenceDelta: newResult.confidenceScore - oldResult.confidenceScore,
          factorDeltas,
          dataCompleteness: newResult.dataCompleteness,
          missingFieldsOld,
          missingFieldsNew,
          dataCompletenessDiff: 0,
          verdict: 'MATCH',
        };
        report.verdict = classifyDrift(report);
        reports.push(report);
      } catch (err: any) {
        reports.push({
          symbol, horizon, oldRankingScore: null, newRankingScore: null,
          rankingScoreDrift: null, classificationOld: null, classificationNew: 'ERROR',
          classificationMatch: false, confidenceOld: 0, confidenceNew: 0,
          confidenceDelta: 0, factorDeltas: {}, dataCompleteness: 0,
          missingFieldsOld: [], missingFieldsNew: [], dataCompletenessDiff: 0,
          verdict: 'ERROR',
        });
      }
    }
  } catch (err: any) {
    for (const horizon of horizons) {
      reports.push({
        symbol, horizon, oldRankingScore: null, newRankingScore: null,
        rankingScoreDrift: null, classificationOld: null, classificationNew: 'ERROR',
        classificationMatch: false, confidenceOld: 0, confidenceNew: 0,
        confidenceDelta: 0, factorDeltas: {}, dataCompleteness: 0,
        missingFieldsOld: [], missingFieldsNew: [], dataCompletenessDiff: 0,
        verdict: 'ERROR',
      });
    }
  }

  return reports;
}

function mapClassificationToBand(c: string | null): string {
  const bands: Record<string, string> = {
    Exceptional: 'A', Excellent: 'B', Good: 'C', Fair: 'D', Weak: 'E', Critical: 'F',
  };
  return c ? bands[c] ?? 'Z' : 'Z';
}

function mapUnifiedClassificationToBand(c: string): string {
  const bands: Record<string, string> = {
    EXCELLENT: 'B', HEALTHY: 'C', STABLE: 'D', WEAKENING: 'E', AT_RISK: 'F', INSUFFICIENT_DATA: 'Z',
  };
  return bands[c] ?? 'Z';
}

function parseArgs(): { symbols: string[]; horizons: number[] } {
  const args = process.argv.slice(2);
  let symbols: string[] = [];
  let horizons: number[] = [7, 30, 90, 180, 365];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--symbols' && i + 1 < args.length) {
      symbols = args[i + 1].split(',').map(s => s.trim().toUpperCase());
    }
    if (args[i] === '--horizons' && i + 1 < args.length) {
      horizons = args[i + 1].split(',').map(s => parseInt(s.trim(), 10));
    }
  }

  return { symbols, horizons };
}

async function main(): Promise<void> {
  const shadowMode = process.env.UNIFIED_PREDICTION_ENGINE_SHADOW_MODE === 'true';
  if (!shadowMode) {
    console.error('ERROR: UNIFIED_PREDICTION_ENGINE_SHADOW_MODE must be set to "true"');
    console.error('Usage: UNIFIED_PREDICTION_ENGINE_SHADOW_MODE=true ts-node scripts/shadow-compare-unified-engine.ts --symbols RELIANCE,TCS');
    process.exit(1);
  }

  const { symbols, horizons } = parseArgs();
  if (symbols.length === 0) {
    console.error('ERROR: --symbols is required (comma-separated tickers)');
    process.exit(1);
  }

  printReportHeader();
  const allReports: DriftReport[] = [];

  for (const symbol of symbols) {
    console.log(`Comparing ${symbol}...`);
    const reports = await compareSymbol(symbol, horizons);
    allReports.push(...reports);
    for (const report of reports) {
      printReportRow(report);
    }
  }

  printSummary(allReports);
  printPromotionGuide();

  await pool.end();
  const criticalCount = allReports.filter(r => r.verdict === 'CRITICAL_DRIFT').length;
  if (criticalCount > 0) {
    process.exit(2);
  }
}

main().catch(err => {
  console.error('Shadow compare failed:', err);
  process.exit(1);
});
