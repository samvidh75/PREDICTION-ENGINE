/**
 * F5: Backtest unified prediction engine with fixture data.
 *
 * Usage: tsx scripts/backtest-unified-engine.ts
 *
 * Since real historical prediction data may not be available,
 * this runs deterministic fixture-based backtests:
 *   - Creates synthetic historical prediction records
 *   - Applies walk-forward validation
 *   - Reports hit rate by decile, classification accuracy, score stability
 *
 * Output: reports/f5-unified-prediction-engine/05-BacktestAndCalibration.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { UnifiedPredictionEngine } from '../src/prediction-engine/UnifiedPredictionEngine';
import { WalkForwardValidator, WalkForwardWindow } from '../src/prediction-engine/validation/WalkForwardValidator';
import { RankingStabilityValidator } from '../src/prediction-engine/validation/RankingStabilityValidator';
import { UnifiedPredictionInput, UnifiedHorizon } from '../src/prediction-engine/types';

const engine = new UnifiedPredictionEngine();
const stabilityValidator = new RankingStabilityValidator();

const SYMBOLS = ['RELIANCE', 'TCS', 'HDFC', 'INFY', 'ICICI', 'SBIN', 'BHARTI', 'KOTAK', 'WIPRO', 'LT'];
const SECTORS: Record<string, string> = {
  RELIANCE: 'Energy', TCS: 'Technology', HDFC: 'Financial', INFY: 'Technology',
  ICICI: 'Financial', SBIN: 'Financial', BHARTI: 'Telecom', KOTAK: 'Financial',
  WIPRO: 'Technology', LT: 'Construction',
};

function makeInput(
  symbol: string,
  tradeDate: string,
  horizon: UnifiedHorizon,
  baseScore: number,
): UnifiedPredictionInput {
  const noise = (Math.random() - 0.5) * 20;
  const score = Math.max(10, Math.min(100, baseScore + noise));
  const pe = 10 + (100 - score) * 0.5;
  const pb = 1 + (100 - score) * 0.04;
  const roe = score / 500;
  const revGrowth = (score - 50) / 250;
  const epsGrowth = (score - 50) / 200;
  const beta = 0.5 + (100 - score) / 50;
  const deRatio = 0.1 + (100 - score) / 40;
  const rsi = 30 + score * 0.5;
  const closePrice = 100 + Math.random() * 900;

  return {
    symbol,
    exchange: 'NSE',
    sector: SECTORS[symbol] ?? 'Other',
    tradeDate,
    horizon,
    close: closePrice,
    open: closePrice * (1 - 0.005 + Math.random() * 0.01),
    high: closePrice * (1 + Math.random() * 0.02),
    low: closePrice * (1 - Math.random() * 0.02),
    volume: Math.round(1_000_000 + Math.random() * 10_000_000),
    closePrices: Array.from({ length: 20 }, (_, i) => closePrice * (1 + (i - 10) * 0.005)),
    tradeDates: Array.from({ length: 20 }, (_, i) => {
      const d = new Date(tradeDate);
      d.setDate(d.getDate() - (19 - i));
      return d.toISOString().split('T')[0];
    }),
    priceFreshnessDays: 1,
    rsi,
    macd: (rsi - 50) * 0.5,
    macdSignal: 0,
    macdHistogram: 0,
    adx: 20 + Math.random() * 20,
    atr: closePrice * 0.02,
    bollingerWidth: 0.05 + Math.random() * 0.1,
    relativeStrength: (score - 50) / 200,
    movingAverageDistance: (score - 50) / 300,
    trendStrength: Math.abs(score - 50) / 100,
    featureFreshnessDays: 1,
    qualityFactor: score,
    valueFactor: score,
    growthFactor: score,
    momentumFactor: score,
    riskFactor: 100 - score,
    sectorStrengthFactor: 50 + (score - 50) * 0.3,
    factorFreshnessDays: 1,
    peRatio: pe,
    pbRatio: pb,
    eps: 10 + Math.random() * 50,
    dividendYield: 0.01 + Math.random() * 0.04,
    beta,
    marketCap: 50_000_000_000 + Math.random() * 2_000_000_000_000,
    freeFloat: 30 + Math.random() * 40,
    fcfYield: 0.02 + Math.random() * 0.06,
    evEbitda: 8 + Math.random() * 15,
    roa: roe * 0.6,
    roe,
    roic: roe * 0.8,
    debtToEquity: deRatio,
    currentRatio: 1 + Math.random() * 2,
    revenueGrowth: revGrowth,
    profitGrowth: revGrowth * 0.8,
    epsGrowth,
    fcfGrowth: epsGrowth * 0.7,
    grossMargin: 0.3 + Math.random() * 0.4,
    operatingMargin: 0.1 + Math.random() * 0.3,
    netMargin: 0.05 + Math.random() * 0.2,
    revenue: 1_000_000_000 + Math.random() * 100_000_000_000,
    operatingProfit: 100_000_000 + Math.random() * 20_000_000_000,
    netProfit: 50_000_000 + Math.random() * 15_000_000_000,
    totalAssets: 5_000_000_000 + Math.random() * 500_000_000_000,
    totalDebt: 500_000_000 + Math.random() * 100_000_000_000,
    equity: 2_000_000_000 + Math.random() * 200_000_000_000,
    cashFlowFromOperations: 200_000_000 + Math.random() * 30_000_000_000,
    fundamentalFreshnessDays: 7,
    providerCount: 3,
    lineageCount: 2,
    fieldCompleteness: 80 + Math.random() * 20,
    staleFieldCount: Math.floor(Math.random() * 3),
    partialFactorCount: Math.floor(Math.random() * 2),
    sourceConfidence: 70 + Math.random() * 30,
    sectorPeers: [],
    freshnessThresholds: {
      priceMaxAgeDays: 5,
      fundamentalMaxAgeDays: 90,
      factorMaxAgeDays: 30,
      featureMaxAgeDays: 30,
    },
  };
}

function generatePredictionHistory(): Array<{
  symbol: string;
  predictionDate: string;
  horizon: UnifiedHorizon;
  actualReturn: number | null;
}> {
  const history: Array<{
    symbol: string;
    predictionDate: string;
    horizon: UnifiedHorizon;
    actualReturn: number | null;
  }> = [];

  const startDate = new Date('2025-01-15');
  const endDate = new Date('2025-12-15');
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0];
    for (const symbol of SYMBOLS) {
      const input = makeInput(symbol, dateStr, 90, 50 + Math.random() * 40);
      const output = engine.evaluate(input);

      if (output.rankingScore !== null) {
        const syntheticReturn = ((output.rankingScore - 50) / 100) * 0.2 + (Math.random() - 0.5) * 0.1;
        history.push({
          symbol,
          predictionDate: dateStr,
          horizon: 90,
          actualReturn: syntheticReturn,
        });
      }
    }
    currentDate.setDate(currentDate.getDate() + 14);
  }

  return history;
}

function buildWalkForwardWindows(): WalkForwardWindow[] {
  return [
    { trainStart: '2025-01-01', trainEnd: '2025-03-31', testStart: '2025-04-01', testEnd: '2025-06-30' },
    { trainStart: '2025-04-01', trainEnd: '2025-06-30', testStart: '2025-07-01', testEnd: '2025-09-30' },
    { trainStart: '2025-07-01', trainEnd: '2025-09-30', testStart: '2025-10-01', testEnd: '2025-12-31' },
  ];
}

async function main() {
  console.log('=== F5 Unified Engine Backtest ===\n');

  console.log('Generating synthetic prediction history...');
  const history = generatePredictionHistory();
  console.log(`Generated ${history.length} historical prediction records across ${SYMBOLS.length} symbols.\n`);

  const windows = buildWalkForwardWindows();
  console.log(`Running walk-forward validation across ${windows.length} windows...\n`);

  const wfValidator = new WalkForwardValidator(engine, windows);
  const wfResults = await wfValidator.validate(history);

  for (let i = 0; i < wfResults.length; i++) {
    const r = wfResults[i];
    console.log(`Window ${i + 1}: ${r.window.testStart} → ${r.window.testEnd}`);
    console.log(`  Predictions: ${r.predictionCount}, Symbols: ${r.symbolCount}`);
    console.log(`  Hit Rate: ${(r.hitRate * 100).toFixed(1)}%`);
    console.log(`  Missing Data: ${(r.missingDataImpact * 100).toFixed(1)}%`);
    if (r.avgReturnByDecile.length > 0) {
      const best = r.avgReturnByDecile[0];
      const worst = r.avgReturnByDecile[r.avgReturnByDecile.length - 1];
      console.log(`  Top Decile Avg Return: ${best.avgReturn !== null ? (best.avgReturn * 100).toFixed(2) + '%' : 'N/A'}`);
      console.log(`  Bottom Decile Avg Return: ${worst.avgReturn !== null ? (worst.avgReturn * 100).toFixed(2) + '%' : 'N/A'}`);
    }
    console.log('');
  }

  console.log('Computing ranking stability...\n');
  const allOutputs = history.map(h => {
    const input = makeInput(h.symbol, h.predictionDate, 90, 50);
    return engine.evaluate(input);
  });

  const stabilityResults = new Map<string, ReturnType<typeof stabilityValidator.validateStability>>();
  for (const symbol of SYMBOLS) {
    const symbolOutputs = allOutputs
      .filter(o => o.symbol === symbol)
      .sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
    if (symbolOutputs.length >= 2) {
      stabilityResults.set(symbol, stabilityValidator.validateStability(symbolOutputs));
    }
  }

  let totalStability = 0;
  let count = 0;
  for (const [symbol, result] of stabilityResults) {
    console.log(`  ${symbol}: stability=${result.overallStabilityScore}, avgChange=${result.averageScoreChange.toFixed(1)}, flips=${(result.classificationFlipRate * 100).toFixed(1)}%`);
    totalStability += result.overallStabilityScore;
    count++;
  }
  const avgStability = count > 0 ? totalStability / count : 0;
  console.log(`\n  Average Stability Score: ${avgStability.toFixed(1)}/100\n`);

  const allScores = allOutputs.map(o => o.rankingScore).filter((s): s is number => s !== null);
  const scoreCollapse = stabilityValidator.detectScoreCollapse(allScores);
  console.log(`Score collapse detected: ${scoreCollapse}`);

  const reportPath = path.resolve(__dirname, '../reports/f5-unified-prediction-engine/05-BacktestAndCalibration.md');
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const lines: string[] = [];
  lines.push('# F5 — Backtest & Calibration');
  lines.push('');
  lines.push('## Backtest Methodology');
  lines.push('');
  lines.push('### Walk-Forward Validation');
  lines.push('The backtest uses walk-forward validation:');
  lines.push('- The prediction period is split into sequential train/test windows');
  lines.push('- Each window\'s training data precedes its test data (no lookahead)');
  lines.push('- The engine is evaluated on each test window independently');
  lines.push('');
  lines.push('### Fixture-Based (Synthetic)');
  lines.push('Since real historical prediction records with known outcomes are not yet available in the unified engine format, synthetic data is generated:');
  lines.push('- **Input generation**: Engine-compatible inputs are created with controlled variability across fundamental, technical, and risk dimensions');
  lines.push('- **Return simulation**: Returns are generated as a function of the engine\'s own ranking score plus noise, creating a known signal structure');
  lines.push('- **Temporal structure**: Records are generated at 2-week intervals across 2025');
  lines.push('- **Cross-section**: 10 symbols across 4 sectors are included');
  lines.push('');
  lines.push('### Limitations');
  lines.push('1. **Synthetic returns**: Actual returns are simulated, not observed. Real market microstructure, regime changes, and outlier events are absent.');
  lines.push('2. **No survivorship bias correction**: The same 10 symbols exist throughout; real backtests must account for delistings, M&A, and new listings.');
  lines.push('3. **Known signal**: Returns are partially derived from the engine\'s own scores, inflating hit rate metrics vs. real-world performance.');
  lines.push('4. **No transaction costs**: Slippage, brokerage, and market impact are not modeled.');
  lines.push('5. **Single horizon**: Only 90-day horizon is backtested.');
  lines.push('');
  lines.push('## Results');
  lines.push('');
  lines.push('### Walk-Forward Windows');
  lines.push('');
  lines.push('| Window | Test Period | Predictions | Symbols | Hit Rate | Missing Data |');
  lines.push('|--------|-------------|-------------|---------|----------|--------------|');
  for (const r of wfResults) {
    lines.push(`| ${r.window.trainStart}–${r.window.trainEnd} | ${r.window.testStart}–${r.window.testEnd} | ${r.predictionCount} | ${r.symbolCount} | ${(r.hitRate * 100).toFixed(1)}% | ${(r.missingDataImpact * 100).toFixed(1)}% |`);
  }
  lines.push('');
  lines.push('### Hit Rate by Decile');
  lines.push('');
  lines.push('| Decile | Avg Return | Count |');
  lines.push('|--------|------------|-------|');
  const allReturns = wfResults.flatMap(r => r.avgReturnByDecile);
  for (const d of allReturns) {
    lines.push(`| ${d.decile} | ${d.avgReturn !== null ? (d.avgReturn * 100).toFixed(2) + '%' : 'N/A'} | ${d.count} |`);
  }
  lines.push('');
  lines.push('### Classification Calibration');
  lines.push('');
  lines.push('Classification maps scores to ordinal bands:');
  lines.push('');
  lines.push('| Classification | Score Range | Implication |');
  lines.push('|----------------|-------------|-------------|');
  lines.push('| EXCELLENT | 80–100 | Strong fundamentals, valuation, momentum |');
  lines.push('| HEALTHY | 65–79 | Above-average quality with manageable risks |');
  lines.push('| STABLE | 50–64 | Fair value, neutral outlook |');
  lines.push('| WEAKENING | 35–49 | Deteriorating metrics or elevated risk |');
  lines.push('| AT_RISK | 0–34 | Poor fundamentals or severe risk factors |');
  lines.push('| INSUFFICIENT_DATA | N/A | Missing critical price data |');
  lines.push('');
  lines.push('The classification bands should be verified against real outcome data when available. Key calibration questions:');
  lines.push('- Do EXCELLENT stocks outperform HEALTHY stocks in realized returns?');
  lines.push('- Is the 50-point STABLE/WEAKENING boundary correctly calibrated?');
  lines.push('- Does INSUFFICIENT_DATA correctly catch low-data-quality names?');
  lines.push('');
  lines.push('### Confidence Calibration');
  lines.push('');
  lines.push('Confidence is computed from data completeness, freshness, and source confidence:');
  lines.push('');
  lines.push('| Level | Score Range | Meaning |');
  lines.push('|-------|-------------|---------|');
  lines.push('| HIGH | 80+ | Fresh, complete, trusted sources |');
  lines.push('| MEDIUM | 60–79 | Minor staleness or gaps |');
  lines.push('| LOW | 40–59 | Notable missing data or age |');
  lines.push('| CRITICAL | <40 | Major data degradation |');
  lines.push('');
  lines.push('Confidence calibration should be validated by:');
  lines.push('1. Comparing prediction accuracy across confidence bands');
  lines.push('2. Confirming that CRITICAL-confidence predictions are less reliable than HIGH-confidence ones');
  lines.push('3. Tuning thresholds so that ~60% of predictions fall in HIGH/MEDIUM bands');
  lines.push('');
  lines.push('### Score Stability');
  lines.push('');
  lines.push('| Symbol | Stability Score | Avg Score Change | Classification Flip Rate |');
  lines.push('|--------|----------------|------------------|-------------------------|');
  for (const [symbol, result] of stabilityResults) {
    lines.push(`| ${symbol} | ${result.overallStabilityScore}/100 | ${result.averageScoreChange.toFixed(1)} | ${(result.classificationFlipRate * 100).toFixed(1)}% |`);
  }
  lines.push('');
  lines.push(`Overall average stability: **${avgStability.toFixed(1)}/100**`);
  lines.push(`Score collapse detected: **${scoreCollapse ? 'YES' : 'NO'}**`);
  lines.push('');
  lines.push('## Blocked Live-Data Gates');
  lines.push('');
  lines.push('The following validation steps require real historical prediction data and are currently blocked:');
  lines.push('');
  lines.push('| Gate | Requirement | Status |');
  lines.push('|------|-------------|--------|');
  lines.push('| Hit rate vs. realized returns | 12+ months of prediction records with actual outcomes | BLOCKED — synthetic only |');
  lines.push('| Classification calibration | Observed return distributions per classification band | BLOCKED — synthetic only |');
  lines.push('| Confidence calibration | Accuracy stratified by confidence level | BLOCKED — synthetic only |');
  lines.push('| Decile monotonicity | Top-decile predictions must outperform bottom-decile on average | BLOCKED — synthetic only |');
  lines.push('| Score stability bounds | Acceptable score change thresholds per symbol | BLOCKED — synthetic only |');
  lines.push('| Walk-forward on live data | Continuous prediction history across market regimes | BLOCKED — synthetic only |');
  lines.push('| Benchmark comparison | Alpha vs. NIFTY 50 / sector indices | BLOCKED — synthetic only |');
  lines.push('');
  lines.push('## Recommendations');
  lines.push('');
  lines.push('### Before Live Data Is Available');
  lines.push('1. **Instrument the engine** to store all unified predictions in a `prediction_history` table with actual return columns');
  lines.push('2. **Backfill** engine history from existing `prediction_registry` data through the StockStory adapter');
  lines.push('3. **Add outcome tracking** via a scheduled job that records realized returns at each horizon');
  lines.push('4. **Set up drift monitoring** to flag when synthetic backtest metrics diverge from live metrics');
  lines.push('');
  lines.push('### When Live Data Is Available');
  lines.push('1. **Rerun walk-forward** using actual temporal splits over 12+ months of prediction data');
  lines.push('2. **Calibrate classification thresholds** using ROC analysis or decile-based return separation');
  lines.push('3. **Validate confidence tiers** by comparing hit rates across HIGH/MEDIUM/LOW/CRITICAL groups');
  lines.push('4. **Set stability bounds** — define maximum acceptable averageScoreChange per symbol');
  lines.push('5. **Benchmark** the unified engine against the existing production engine (shadow mode drift report)');
  lines.push('6. **Implement alerting** for score collapse, classification drift, and decile inversion');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push(`*Report generated at ${new Date().toISOString()}*  `);
  lines.push(`*Engine version: ${engine['config'].modelVersion}*`);

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`\nReport written to ${reportPath}`);
}

main().catch(console.error);
