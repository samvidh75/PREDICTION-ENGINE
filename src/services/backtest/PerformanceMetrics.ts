import { BacktestMetrics } from './types';

const TRADING_DAYS = 252;

/** Compute standard performance metrics from a series of periodic (daily) returns. */
export function computeMetrics(returns: number[], riskFreeRate = 0.065): BacktestMetrics {
  if (returns.length === 0) {
    return {
      totalReturnPct: 0,
      annualizedReturnPct: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdownPct: 0,
      maxDrawdownDurationDays: 0,
      winRate: 0,
      volatilityAnnualized: 0,
      numPeriods: 0,
    };
  }

  for (const r of returns) {
    if (!Number.isFinite(r)) throw new Error('computeMetrics: non-finite return');
  }

  const n = returns.length;
  const totalGrowth = returns.reduce((g, r) => g * (1 + r), 1);
  const totalReturnPct = (totalGrowth - 1) * 100;
  const annualizedReturn = Math.pow(totalGrowth, TRADING_DAYS / n) - 1;

  const mean = returns.reduce((s, r) => s + r, 0) / n;
  const variance = n > 1 ? returns.reduce((s, r) => s + (r - mean) * (r - mean), 0) / (n - 1) : 0;
  const dailyVol = Math.sqrt(variance);
  const annualVol = dailyVol * Math.sqrt(TRADING_DAYS);

  const dailyRiskFree = riskFreeRate / TRADING_DAYS;
  const sharpe = dailyVol > 0 ? ((mean - dailyRiskFree) / dailyVol) * Math.sqrt(TRADING_DAYS) : 0;

  const downside = returns.filter(r => r < dailyRiskFree).map(r => (r - dailyRiskFree) ** 2);
  const downsideDev = downside.length > 0 ? Math.sqrt(downside.reduce((s, v) => s + v, 0) / downside.length) : 0;
  const sortino = downsideDev > 0 ? ((mean - dailyRiskFree) / downsideDev) * Math.sqrt(TRADING_DAYS) : 0;

  // Max drawdown and its duration
  let peak = 1;
  let equity = 1;
  let maxDD = 0;
  let ddStart = 0;
  let maxDDDuration = 0;
  for (let i = 0; i < n; i++) {
    equity *= 1 + returns[i];
    if (equity > peak) {
      peak = equity;
      ddStart = i;
    }
    const dd = (peak - equity) / peak;
    if (dd > maxDD) maxDD = dd;
    if (dd > 0) maxDDDuration = Math.max(maxDDDuration, i - ddStart);
  }

  const winRate = returns.filter(r => r > 0).length / n;

  return {
    totalReturnPct,
    annualizedReturnPct: annualizedReturn * 100,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    maxDrawdownPct: maxDD * 100,
    maxDrawdownDurationDays: maxDDDuration,
    winRate,
    volatilityAnnualized: annualVol,
    numPeriods: n,
  };
}

/** Convert close prices to simple returns. */
export function pricesToReturns(closes: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] <= 0) throw new Error('pricesToReturns: non-positive price');
    returns.push(closes[i] / closes[i - 1] - 1);
  }
  return returns;
}
