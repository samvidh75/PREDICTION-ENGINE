import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerBacktestRoutes } from './backtestRoutes';
import type { BenchmarkResult, StrategyResult } from '../../../backtest/types';

function strategyResult(overrides: Partial<StrategyResult> = {}): StrategyResult {
  return {
    strategy: 'TOP_20',
    rebalance: 'MONTHLY',
    metrics: {
      cagr: 0.18,
      sharpe: 1.2,
      sortino: 1.5,
      maxDrawdown: 0.14,
      volatility: 0.2,
      totalReturn: 0.25,
      positiveMonths: 7,
      totalMonths: 10,
      winRate: 0.7,
    },
    alpha: 0.05,
    trackingError: 0.06,
    informationRatio: 0.8,
    turnover: 0.15,
    hitRate: 0.7,
    ...overrides,
  };
}

function benchmarkResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    index: 'PSE_ALL',
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    constituents: 500,
    metrics: {
      cagr: 0.12,
      sharpe: 0.8,
      sortino: 1.0,
      maxDrawdown: 0.18,
      volatility: 0.19,
      totalReturn: 0.16,
      positiveMonths: 6,
      totalMonths: 10,
      winRate: 0.6,
    },
    ...overrides,
  };
}

describe('registerBacktestRoutes', () => {
  it('returns a combined run backtest response', async () => {
    const app = Fastify();
    await registerBacktestRoutes(app, {
      simulateStrategy: async () => strategyResult(),
      computeBenchmark: async () => benchmarkResult(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/backtest/run',
      payload: {
        strategy: 'TOP_20',
        rebalance: 'MONTHLY',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        benchmark: 'PSE_ALL',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.relativePerformance.alphaVsBenchmark).toBe(0.06);
    expect(body.strategyResult.strategy).toBe('TOP_20');
    expect(body.benchmarkResult.index).toBe('PSE_ALL');
  });

  it('validates bad run requests', async () => {
    const app = Fastify();
    await registerBacktestRoutes(app, {
      simulateStrategy: async () => strategyResult(),
      computeBenchmark: async () => benchmarkResult(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/backtest/run',
      payload: {
        strategy: 'BAD',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      },
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toContain('Invalid strategy');
  });

  it('returns walk-forward summary across combinations', async () => {
    const app = Fastify();
    await registerBacktestRoutes(app, {
      simulateStrategy: async (strategy, rebalance) =>
        strategyResult({
          strategy,
          rebalance,
          metrics: {
            ...strategyResult().metrics,
            cagr: strategy === 'TOP_10' ? 0.2 : 0.11,
            sharpe: rebalance === 'MONTHLY' ? 1.1 : 0.9,
          },
        }),
      computeBenchmark: async () => benchmarkResult(),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/backtest/walk-forward',
      payload: {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        strategies: ['TOP_10', 'TOP_20'],
        rebalances: ['MONTHLY', 'QUARTERLY'],
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summary.combinations).toBe(4);
    expect(body.summary.bestStrategy.strategy).toBe('TOP_10');
    expect(body.results).toHaveLength(4);
  });
});
