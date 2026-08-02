#!/usr/bin/env npx tsx
/**
 * calibrate-technical-regime.ts — Phase 9
 * Audits technical regime calibration (momentum, RSI, moving averages,
 * volume trends) against Indian market realities.
 *
 * Usage: npx tsx scripts/intelligence/calibrate-technical-regime.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { DEFAULT_CALIBRATION } from '../../src/stockstory/intelligence/calibration/CalibrationTypes';

const REPORTS_DIR = path.resolve('reports/intelligence');

interface TechnicalRegime {
  name: string;
  description: string;
  rsiRange: { min: number; max: number };
  movingAverageSignal: string;
  volumeTrend: string;
  typicalDuration: string;
  recommendedAction: string;
}

const TECHNICAL_REGIMES: TechnicalRegime[] = [
  {
    name: 'Strong Bullish',
    description: 'Price above all key MAs, rising volume, RSI 60-75, strong momentum',
    rsiRange: { min: 60, max: 75 },
    movingAverageSignal: '20 > 50 > 200 DMA, all rising',
    volumeTrend: 'Increasing on up days, decreasing on down days',
    typicalDuration: '4–12 weeks',
    recommendedAction: 'Hold with trailing stops; add on dips to 20 DMA',
  },
  {
    name: 'Moderate Bullish',
    description: 'Price above 50 & 200 DMA, RSI 50-65, steady accumulation',
    rsiRange: { min: 50, max: 65 },
    movingAverageSignal: '20 DMA flattening, 50 > 200 DMA rising',
    volumeTrend: 'Steady accumulation, no distribution spikes',
    typicalDuration: '6–16 weeks',
    recommendedAction: 'Accumulate on pullbacks; set stop at 50 DMA',
  },
  {
    name: 'Sideways / Rangebound',
    description: 'Price oscillating between support/resistance, RSI 40-60, flat MAs',
    rsiRange: { min: 40, max: 60 },
    movingAverageSignal: 'All MAs flattening and converging',
    volumeTrend: 'Low and declining volume',
    typicalDuration: '4–20 weeks',
    recommendedAction: 'Sell OTM options; wait for breakout confirmation',
  },
  {
    name: 'Moderate Bearish',
    description: 'Price below 20 & 50 DMA, RSI 35-50, distribution visible',
    rsiRange: { min: 35, max: 50 },
    movingAverageSignal: '20 < 50 DMA, both declining',
    volumeTrend: 'Higher volume on down days',
    typicalDuration: '4–12 weeks',
    recommendedAction: 'Reduce position; hedge with puts; wait for capitulation',
  },
  {
    name: 'Strong Bearish',
    description: 'Price below all MAs, RSI <35, heavy selling pressure',
    rsiRange: { min: 15, max: 35 },
    movingAverageSignal: '20 < 50 < 200 DMA, all declining (death cross)',
    volumeTrend: 'Spikes on breakdowns, climactic selling',
    typicalDuration: '2–8 weeks (can extend)',
    recommendedAction: 'Exit or minimal position; watch for reversal signals',
  },
];

interface TechnicalTest {
  symbol: string;
  sector: string;
  marketCapCr: number;
  rsi: number;
  above20dma: boolean;
  above50dma: boolean;
  above200dma: boolean;
  volumeSpike: boolean;
  regime: string;
}

const TECHNICAL_TESTS: TechnicalTest[] = [
  { symbol: 'RELIANCE', sector: 'Oil & Gas', marketCapCr: 2000000, rsi: 62, above20dma: true, above50dma: true, above200dma: true, volumeSpike: false, regime: 'Strong Bullish' },
  { symbol: 'TCS', sector: 'IT Services', marketCapCr: 1500000, rsi: 55, above20dma: true, above50dma: true, above200dma: true, volumeSpike: false, regime: 'Moderate Bullish' },
  { symbol: 'HDFCBANK', sector: 'Banking', marketCapCr: 1200000, rsi: 48, above20dma: false, above50dma: true, above200dma: true, volumeSpike: false, regime: 'Sideways / Rangebound' },
  { symbol: 'ITC', sector: 'FMCG', marketCapCr: 600000, rsi: 42, above20dma: false, above50dma: false, above200dma: true, volumeSpike: true, regime: 'Moderate Bearish' },
  { symbol: 'TATAMOTORS', sector: 'Automobile', marketCapCr: 280000, rsi: 28, above20dma: false, above50dma: false, above200dma: false, volumeSpike: true, regime: 'Strong Bearish' },
  { symbol: 'ZOMATO', sector: 'Internet', marketCapCr: 150000, rsi: 35, above20dma: false, above50dma: false, above200dma: true, volumeSpike: true, regime: 'Moderate Bearish' },
];

function classifyRegime(rsi: number, above20: boolean, above50: boolean, above200: boolean, volSpike: boolean): string {
  if (above20 && above50 && above200 && rsi > 55) {
    return rsi > 65 ? 'Strong Bullish' : 'Moderate Bullish';
  }
  if (!above20 && !above50 && !above200 && rsi < 35) {
    return 'Strong Bearish';
  }
  if (!above20 && !above50 && above200 && rsi < 50) {
    return 'Moderate Bearish';
  }
  if (above200 && !above20 && !above50 && rsi < 50) {
    return 'Sideways / Rangebound';
  }
  return 'Sideways / Rangebound';
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║      Phase 9 — Technical Regime Calibration               ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  const results: string[] = [];
  results.push('# Technical Regime Calibration', '');
  results.push(`**Generated:** ${new Date().toISOString()}`, '');
  results.push(`**Regimes Defined:** ${TECHNICAL_REGIMES.length}`, '');

  results.push('## Regime Definitions', '');
  for (const regime of TECHNICAL_REGIMES) {
    results.push(`### ${regime.name}`, '');
    results.push(`- **Description:** ${regime.description}`);
    results.push(`- **RSI Range:** ${regime.rsiRange.min}–${regime.rsiRange.max}`);
    results.push(`- **MA Signal:** ${regime.movingAverageSignal}`);
    results.push(`- **Volume:** ${regime.volumeTrend}`);
    results.push(`- **Duration:** ${regime.typicalDuration}`);
    results.push(`- **Action:** ${regime.recommendedAction}`);
    results.push('');
  }

  results.push('## Regime Classification Test', '');
  results.push('| Symbol | RSI | 20DMA | 50DMA | 200DMA | Vol Spike | Predicted | Expected | Match? |');
  results.push('|--------|-----|-------|-------|--------|-----------|-----------|----------|--------|');

  for (const t of TECHNICAL_TESTS) {
    const predicted = classifyRegime(t.rsi, t.above20dma, t.above50dma, t.above200dma, t.volumeSpike);
    const match = predicted === t.regime;
    results.push(
      `| ${t.symbol} | ${t.rsi} | ${t.above20dma ? '✅' : '❌'} | ${t.above50dma ? '✅' : '❌'} | ${t.above200dma ? '✅' : '❌'} | ${t.volumeSpike ? '⚠️' : '✅'} | ${predicted} | ${t.regime} | ${match ? '✅' : '❌'} |`,
    );
  }

  results.push('', '## Calibration Summary', '');
  results.push(`- **Default calibration:** maShort=${DEFAULT_CALIBRATION.technical.maShort}, maMedium=${DEFAULT_CALIBRATION.technical.maMedium}, maLong=${DEFAULT_CALIBRATION.technical.maLong}`);
  results.push(`- **RSI thresholds:** oversold=${DEFAULT_CALIBRATION.technical.rsiOversold}, overbought=${DEFAULT_CALIBRATION.technical.rsiOverbought}`);
  results.push(`- **Volume threshold:** ${DEFAULT_CALIBRATION.technical.volumeSpikeThreshold}x average`);
  results.push(`- **Momentum lookback:** ${DEFAULT_CALIBRATION.technical.momentumLookback} days`);

  const reportPath = path.join(REPORTS_DIR, '09-technical-regime-calibration.md');
  fs.writeFileSync(reportPath, results.join('\n'), 'utf-8');
  console.log(`📄 Report: ${reportPath}`);
  console.log(`✅ Technical regime audit complete: ${TECHNICAL_REGIMES.length} regimes, ${TECHNICAL_TESTS.length} tests`);
}

main().catch(err => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
