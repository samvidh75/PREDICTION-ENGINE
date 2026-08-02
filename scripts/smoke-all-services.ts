#!/usr/bin/env tsx
/**
 * smoke-all-services.ts
 *
 * Quick smoke test that imports and exercises every new service
 * to verify they work end-to-end without throwing.
 *
 * Usage:
 *   npx tsx scripts/smoke-all-services.ts
 *   # or via npm script:
 *   npm run smoke:services
 */

/* ── 1. DCFValuationService ────────────────────────────────────── */
import { DCFValuationService } from '../src/services/valuation/DCFValuationService';

function smokeDCF(): string[] {
  const lines: string[] = [];
  const svc = new DCFValuationService();
  const result = svc.compute({
    freeCashFlow: 10_000_000_000,
    fcfGrowthRate: 0.15,
    growthDeclineYears: 10,
    terminalGrowthRate: 0.04,
    discountRate: 0.12,
    netDebt: 50_000_000_000,
    sharesOutstanding: 1_000_000_000,
    cashAndEquivalents: 10_000_000_000,
    marginOfSafety: 0.20,
  }, 2500);
  lines.push(`DCF fair value: ₹${result.fairValuePerShare} → ${result.assessment} (upside: ${result.upside}%)`);
  lines.push(`  Terminal value: ₹${(result.terminalValue / 1e7).toFixed(1)}Cr`);
  return lines;
}

/* ── 2. OptionsChainService ────────────────────────────────────── */
import { OptionsChainService } from '../src/services/options/OptionsChainService';

function smokeOptions(): string[] {
  const lines: string[] = [];
  const svc = new OptionsChainService();
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 30);
  const chain = svc.generateChain('NIFTY', 19500, expiry.toISOString().split('T')[0]);
  lines.push(`Options chain: ${chain.calls.length} calls, ${chain.puts.length} puts`);
  lines.push(`  PCR: ${chain.pcRatio}, Max Pain: ${chain.maxPain}`);
  const greeks = svc.computeGreeks({ spot: 19500, strike: 19600, timeToExpiry: 0.082, volatility: 0.2, riskFreeRate: 0.065 });
  lines.push(`  Greeks: Δ=${greeks.delta.toFixed(3)} Γ=${greeks.gamma.toFixed(5)} Θ=${greeks.theta.toFixed(2)}`);
  return lines;
}

/* ── 3. BacktestEngine ─────────────────────────────────────────── */
import { BacktestEngine } from '../src/services/backtest/BacktestEngine';
import type { PriceBar } from '../src/services/backtest/BacktestEngine';

function makeBars(n: number): PriceBar[] {
  const bars: PriceBar[] = [];
  let p = 100;
  for (let i = 0; i < n; i++) {
    p += (Math.random() - 0.45) * 2;
    const d = new Date(2024, 0, 1);
    d.setDate(d.getDate() + i);
    bars.push({ date: d.toISOString().split('T')[0], open: p - 1, high: p + 2, low: p - 2, close: p, volume: 1e6 });
  }
  return bars;
}

async function smokeBacktest(): Promise<string[]> {
  const lines: string[] = [];
  const svc = new BacktestEngine();
  const result = await svc.run({
    symbol: 'SMOKE', strategy: 'buy_hold', startDate: '2024-01-01', endDate: '2024-12-31', initialCapital: 100_000, params: {},
  }, makeBars(252));
  lines.push(`Backtest (buy & hold): ₹${result.initialCapital} → ₹${result.finalCapital}`);
  lines.push(`  CAGR: ${result.cagr}%, Sharpe: ${result.sharpeRatio}, Max DD: ${result.maxDrawdownPercent}%`);
  return lines;
}

/* ── 4. AlertEngine ────────────────────────────────────────────── */
import { AlertEngine } from '../src/services/alerts/AlertEngine';

function smokeAlerts(): string[] {
  const lines: string[] = [];
  const svc = new AlertEngine();
  svc.clearAll();

  const alert = svc.addAlert({ symbol: 'RELIANCE', condition: 'price_above', value: 2400, repeat: 'once', label: 'Test', enabled: true });
  const events = svc.evaluate({
    symbol: 'RELIANCE', price: 2500, change: 50, changePercent: 2, volume: 1e6, rsi: 60, timestamp: new Date().toISOString(),
  });
  lines.push(`Alerts: added 1, triggered ${events.length} (${events[0]?.condition ?? 'none'})`);
  svc.clearAll();
  return lines;
}

/* ── 5. XIRRCalculator ─────────────────────────────────────────── */
import { XIRRCalculator } from '../src/services/portfolio/XIRRCalculator';

function smokeXIRR(): string[] {
  const lines: string[] = [];
  const svc = new XIRRCalculator();
  const lumpSum = svc.calculateLumpSum(100_000, '2024-01-01', 110_000);
  lines.push(`XIRR (lump sum): ${lumpSum.xirr}% (invested ₹${lumpSum.totalInvested} → ₹${lumpSum.currentValue})`);
  const sip = svc.calculateSIP(10_000, 12, 135_000);
  lines.push(`XIRR (SIP 12m): ${sip.xirr}% (invested ₹${sip.totalInvested} → ₹${sip.currentValue})`);
  return lines;
}

/* ── 6. AdvancedTechnicalService ───────────────────────────────── */
import { AdvancedTechnicalService } from '../src/services/technical/AdvancedTechnicalService';

function smokeTechnical(): string[] {
  const lines: string[] = [];
  const svc = new AdvancedTechnicalService();
  const prices = Array.from({ length: 200 }, (_, i) => 100 + Math.sin(i * 0.1) * 10 + i * 0.2);
  const volumes = prices.map(() => 1_000_000 + Math.random() * 500_000);
  const highs = prices.map(p => p + Math.random() * 3);
  const lows = prices.map(p => p - Math.random() * 3);
  const ind = svc.computeAll(prices, volumes, highs, lows);
  lines.push(`Technical: RSI=${ind.rsi}, MACD=${ind.macd.toFixed(2)}, Bollinger W=${ind.bollingerWidth.toFixed(3)}`);
  const signals = svc.computeSignals(ind);
  lines.push(`  Signal: ${signals.signal} (strength: ${signals.strength})`);
  return lines;
}

/* ── Main ──────────────────────────────────────────────────────── */
async function main() {
  console.log('══════════════════════════════════════════════');
  console.log('  StockStory — Service Smoke Tests');
  console.log('══════════════════════════════════════════════\n');

  const allLines: string[] = [];

  console.log('◆ DCFValuationService');
  allLines.push(...smokeDCF());

  console.log('\n◆ OptionsChainService');
  allLines.push(...smokeOptions());

  console.log('\n◆ BacktestEngine');
  allLines.push(...await smokeBacktest());

  console.log('\n◆ AlertEngine');
  allLines.push(...smokeAlerts());

  console.log('\n◆ XIRRCalculator');
  allLines.push(...smokeXIRR());

  console.log('\n◆ AdvancedTechnicalService');
  allLines.push(...smokeTechnical());

  console.log('\n──────────────────────────────────────────────');
  console.log('  All services completed without throwing.');
  console.log('──────────────────────────────────────────────\n');

  for (const line of allLines) {
    console.log(line);
  }
}

main().catch((err) => {
  console.error('SMOKE TEST FAILED:', err);
  process.exit(1);
});
