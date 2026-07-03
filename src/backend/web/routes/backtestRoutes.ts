import type { FastifyInstance } from 'fastify';
import {
  benchmarkEngine,
} from '../../../backtest/BenchmarkEngine.js';
import {
  portfolioSimulator,
} from '../../../backtest/PortfolioSimulator.js';
import type {
  BenchmarkIndex,
  RebalanceFrequency,
  StrategyType,
} from '../../../backtest/types.js';

type RunBacktestBody = {
  strategy?: StrategyType;
  rebalance?: RebalanceFrequency;
  startDate?: string;
  endDate?: string;
  benchmark?: BenchmarkIndex;
};

type WalkForwardBody = {
  startDate?: string;
  endDate?: string;
  strategies?: StrategyType[];
  rebalances?: RebalanceFrequency[];
};

export interface BacktestRouteDeps {
  simulateStrategy: typeof portfolioSimulator.simulateStrategy;
  computeBenchmark: typeof benchmarkEngine.computeBenchmark;
}

const DEFAULT_DEPS: BacktestRouteDeps = {
  simulateStrategy: portfolioSimulator.simulateStrategy.bind(portfolioSimulator),
  computeBenchmark: benchmarkEngine.computeBenchmark.bind(benchmarkEngine),
};

const VALID_STRATEGIES: StrategyType[] = [
  'TOP_10',
  'TOP_20',
  'TOP_50',
  'SECTOR_BALANCED_TOP_20',
  'CONFIDENCE_WEIGHTED',
];

const VALID_REBALANCES: RebalanceFrequency[] = ['WEEKLY', 'MONTHLY', 'QUARTERLY'];
const VALID_BENCHMARKS: BenchmarkIndex[] = ['NIFTY50', 'NIFTY100', 'NIFTY500', 'EQUAL_WEIGHT_UNIVERSE'];

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseRunBacktestBody(body: unknown): { ok: true; value: Required<RunBacktestBody> } | { ok: false; error: string } {
  const payload = (body ?? {}) as RunBacktestBody;
  const strategy = payload.strategy ?? 'TOP_20';
  const rebalance = payload.rebalance ?? 'MONTHLY';
  const startDate = payload.startDate ?? '';
  const endDate = payload.endDate ?? '';
  const benchmark = payload.benchmark ?? 'NIFTY500';

  if (!VALID_STRATEGIES.includes(strategy)) return { ok: false, error: 'Invalid strategy' };
  if (!VALID_REBALANCES.includes(rebalance)) return { ok: false, error: 'Invalid rebalance frequency' };
  if (!VALID_BENCHMARKS.includes(benchmark)) return { ok: false, error: 'Invalid benchmark' };
  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { ok: false, error: 'startDate and endDate must be YYYY-MM-DD' };
  if (startDate > endDate) return { ok: false, error: 'startDate must be on or before endDate' };

  return { ok: true, value: { strategy, rebalance, startDate, endDate, benchmark } };
}

function parseWalkForwardBody(body: unknown): { ok: true; value: Required<WalkForwardBody> } | { ok: false; error: string } {
  const payload = (body ?? {}) as WalkForwardBody;
  const startDate = payload.startDate ?? '';
  const endDate = payload.endDate ?? '';
  const strategies = Array.isArray(payload.strategies) && payload.strategies.length > 0 ? payload.strategies : ['TOP_10', 'TOP_20', 'SECTOR_BALANCED_TOP_20'];
  const rebalances = Array.isArray(payload.rebalances) && payload.rebalances.length > 0 ? payload.rebalances : ['MONTHLY'];

  if (!isIsoDate(startDate) || !isIsoDate(endDate)) return { ok: false, error: 'startDate and endDate must be YYYY-MM-DD' };
  if (startDate > endDate) return { ok: false, error: 'startDate must be on or before endDate' };
  if (strategies.some((strategy) => !VALID_STRATEGIES.includes(strategy))) return { ok: false, error: 'Invalid strategy in strategies array' };
  if (rebalances.some((rebalance) => !VALID_REBALANCES.includes(rebalance))) return { ok: false, error: 'Invalid rebalance in rebalances array' };

  return { ok: true, value: { startDate, endDate, strategies, rebalances } };
}

export async function registerBacktestRoutes(app: FastifyInstance, deps: BacktestRouteDeps = DEFAULT_DEPS) {
  app.post('/api/backtest/run', async (request, reply) => {
    const parsed = parseRunBacktestBody(request.body);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const { strategy, rebalance, startDate, endDate, benchmark } = parsed.value;
    const [strategyResult, benchmarkResult] = await Promise.all([
      deps.simulateStrategy(strategy, rebalance, startDate, endDate),
      deps.computeBenchmark(benchmark, startDate, endDate),
    ]);

    return {
      availability: 'real',
      request: parsed.value,
      strategyResult,
      benchmarkResult,
      relativePerformance: {
        alphaVsBenchmark: Number((strategyResult.metrics.cagr - benchmarkResult.metrics.cagr).toFixed(4)),
        excessSharpe: Number((strategyResult.metrics.sharpe - benchmarkResult.metrics.sharpe).toFixed(4)),
      },
    };
  });

  app.post('/api/backtest/walk-forward', async (request, reply) => {
    const parsed = parseWalkForwardBody(request.body);
    if (!parsed.ok) {
      return reply.status(400).send({ error: parsed.error });
    }

    const { startDate, endDate, strategies, rebalances } = parsed.value;
    const results = [];
    for (const strategy of strategies) {
      for (const rebalance of rebalances) {
        const strategyResult = await deps.simulateStrategy(strategy, rebalance, startDate, endDate);
        results.push(strategyResult);
      }
    }

    const ranked = [...results].sort((a, b) => b.metrics.cagr - a.metrics.cagr);

    return {
      availability: 'real',
      request: parsed.value,
      summary: {
        combinations: results.length,
        bestStrategy: ranked[0] ?? null,
        worstStrategy: ranked[ranked.length - 1] ?? null,
        averageCagr: results.length > 0
          ? Number((results.reduce((sum, result) => sum + result.metrics.cagr, 0) / results.length).toFixed(4))
          : 0,
        averageSharpe: results.length > 0
          ? Number((results.reduce((sum, result) => sum + result.metrics.sharpe, 0) / results.length).toFixed(4))
          : 0,
      },
      results,
    };
  });
}
