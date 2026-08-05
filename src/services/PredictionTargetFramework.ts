// src/services/PredictionTargetFramework.ts
// Production Prediction Target Framework.
// Defines and computes training targets: 7D / 30D / 90D returns, an
// annualized risk-adjusted return, and a *probabilistic* 30-day drawdown
// probability estimated by seeded Monte Carlo simulation (not a crude
// binary 0/1 flag).

export interface PredictionTargets {
  return7D: number;
  return30D: number;
  return90D: number;
  riskAdjustedReturn30D: number;
  /** Probability (0..1) that price ever falls >5% from a running peak within 30 trading days. */
  drawdownProbability30D: number;
}

const TRADING_DAYS = 252;

/**
 * Mulberry32 seeded PRNG — deterministic, so drawdown-probability estimates
 * are reproducible and unit-testable (this is the same generator used by
 * MonteCarloSimulator).
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normalRandom(rng: () => number): number {
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2);
}

export class PredictionTargetFramework {
  /**
   * Estimate the probability that a price series drops at least
   * `drawdownThreshold` below its running peak within `horizonDays` trading
   * days, using geometric-Brownian-motion Monte Carlo paths parameterized by
   * an annualized volatility. Deterministic when `seed` is fixed.
   */
  estimateDrawdownProbability(
    volatilityAnnualized: number,
    horizonDays = 30,
    drawdownThreshold = 0.05,
    simulations = 4000,
    seed = 42,
  ): number {
    const vol = Math.max(volatilityAnnualized, 1e-4);
    const sigmaDaily = vol / Math.sqrt(TRADING_DAYS);
    const rng = mulberry32(seed);
    let hit = 0;
    for (let sim = 0; sim < simulations; sim++) {
      let price = 1;
      let peak = 1;
      let drawdownHit = false;
      for (let d = 0; d < horizonDays; d++) {
        price *= 1 + sigmaDaily * normalRandom(rng);
        if (price > peak) peak = price;
        if ((peak - price) / peak > drawdownThreshold) {
          drawdownHit = true;
          break;
        }
      }
      if (drawdownHit) hit++;
    }
    return hit / simulations;
  }

  /**
   * Calculates target variables for a given index in a historical price series.
   * Adds a continuous Monte-Carlo drawdown probability in place of the old
   * binary flag, and an annualized Sharpe-style risk-adjusted return.
   */
  calculateTargets(
    prices: { close: number }[],
    volatility20D: number[],
    currentIndex: number,
  ): PredictionTargets | null {
    const n = prices.length;
    const closeToday = prices[currentIndex].close;

    const has7D = currentIndex + 7 < n;
    const has30D = currentIndex + 30 < n;
    const has90D = currentIndex + 90 < n;

    if (!has7D) return null;

    const return7D = (prices[currentIndex + 7].close - closeToday) / closeToday;
    const return30D = has30D ? (prices[currentIndex + 30].close - closeToday) / closeToday : 0;
    const return90D = has90D ? (prices[currentIndex + 90].close - closeToday) / closeToday : 0;

    // Annualized risk-adjusted return (Sharpe-style): mean daily return over
    // the 30D window, scaled by sqrt(252) and divided by daily volatility.
    const vol = volatility20D[currentIndex] || 0.15; // annualized-ish (e.g. 0.15 = 15%)
    const dailyVol = vol / Math.sqrt(TRADING_DAYS);
    let riskAdjustedReturn30D = 0;
    if (has30D && dailyVol > 0) {
      const windowReturns: number[] = [];
      for (let i = currentIndex + 1; i <= currentIndex + 30; i++) {
        windowReturns.push(prices[i].close / prices[i - 1].close - 1);
      }
      const meanDaily = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
      riskAdjustedReturn30D = (meanDaily / dailyVol) * Math.sqrt(TRADING_DAYS);
    }

    // Continuous probability of an intra-30-day >5% drawdown.
    const drawdownProbability30D = this.estimateDrawdownProbability(vol);

    return {
      return7D,
      return30D,
      return90D,
      riskAdjustedReturn30D,
      drawdownProbability30D,
    };
  }
}

export const predictionTargetFramework = new PredictionTargetFramework();
export default predictionTargetFramework;

