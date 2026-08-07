import { BacktestBar, StrategyFn, WalkForwardResult, WalkForwardWindow } from './types';
import { computeMetrics, pricesToReturns } from './PerformanceMetrics';

export interface WalkForwardConfig {
  trainWindowDays: number; // e.g. 252
  testWindowDays: number; // e.g. 63
  stepDays: number; // e.g. 21 (monthly re-fit)
  slippageBps?: number; // per position change, default 5
  commissionBps?: number; // per position change, default 3
}

/**
 * Walk-forward validation: repeatedly fit a strategy on a training window
 * and evaluate it strictly out-of-sample on the following test window.
 * The strategy never sees test data — the anti-lookahead guarantee comes
 * from slicing returns *before* the strategy function is invoked.
 *
 * Per-window `testMetrics` evaluate each window's full test span on its own.
 * The `aggregateOutOfSample` / `equityCurve`, however, are built from a
 * CHAINED series that counts each trading day exactly once: a window's
 * exposure only drives returns until the next refit, so only the first
 * `stepDays` days of each test window (the days a position is actually held)
 * enter the aggregate. Without this, test windows that overlap
 * (`stepDays < testWindowDays`) compound the same days multiple times and
 * inflate the aggregate return.
 */
export class WalkForwardValidator {
  constructor(private readonly config: WalkForwardConfig) {
    if (config.trainWindowDays < 2) throw new Error('WalkForwardValidator: trainWindowDays must be >= 2');
    if (config.testWindowDays < 1) throw new Error('WalkForwardValidator: testWindowDays must be >= 1');
    if (config.stepDays < 1) throw new Error('WalkForwardValidator: stepDays must be >= 1');
  }

  validate(bars: BacktestBar[], strategy: StrategyFn): WalkForwardResult {
    const { trainWindowDays, testWindowDays, stepDays } = this.config;
    const slippage = (this.config.slippageBps ?? 5) / 10_000;
    const commission = (this.config.commissionBps ?? 3) / 10_000;

    if (bars.length < trainWindowDays + testWindowDays + 1) {
      throw new Error(
        `WalkForwardValidator: need at least ${trainWindowDays + testWindowDays + 1} bars, got ${bars.length}`,
      );
    }

    const closes = bars.map(b => b.close);
    const returns = pricesToReturns(closes); // returns[i] = bar[i] -> bar[i+1]

    const windows: WalkForwardWindow[] = [];
    const oosReturns: number[] = [];
    const equityCurve: Array<{ date: string; value: number }> = [];
    let equity = 1;
    let previousExposure = 0;

    for (
      let trainStart = 0;
      trainStart + trainWindowDays + testWindowDays <= returns.length;
      trainStart += stepDays
    ) {
      const trainEnd = trainStart + trainWindowDays;
      const testEnd = trainEnd + testWindowDays;

      const trainReturns = returns.slice(trainStart, trainEnd);
      const exposure = this.clampExposure(strategy(trainReturns));

      const testReturns = returns.slice(trainEnd, testEnd);
      const windowNetReturns: number[] = [];
      // Days actually traded before the next refit. With overlapping test
      // windows (`stepDays < testWindowDays`) only the first `stepDays` days
      // are new — chaining them gives a contiguous, non-overlapping OOS
      // series so the aggregate never double-counts the same trading day.
      const chainedDays = Math.min(stepDays, testReturns.length);
      for (let i = 0; i < testReturns.length; i++) {
        let net = exposure * testReturns[i];
        if (i === 0) {
          const turnover = Math.abs(exposure - previousExposure);
          net -= turnover * (slippage + commission);
        }
        windowNetReturns.push(net);
        if (i < chainedDays) {
          oosReturns.push(net);
          equity *= 1 + net;
          equityCurve.push({ date: bars[trainEnd + i + 1].date, value: equity });
        }
      }
      previousExposure = exposure;

      windows.push({
        trainStart: bars[trainStart].date,
        trainEnd: bars[trainEnd].date,
        testStart: bars[trainEnd].date,
        testEnd: bars[testEnd].date,
        testMetrics: computeMetrics(windowNetReturns),
      });
    }

    return {
      windows,
      aggregateOutOfSample: computeMetrics(oosReturns),
      equityCurve,
    };
  }

  private clampExposure(raw: number): number {
    if (!Number.isFinite(raw)) return 0;
    return Math.max(0, Math.min(1, raw)); // long-only, no leverage (PSX retail)
  }
}
