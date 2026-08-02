import type { FastifyInstance } from 'fastify';
import {
  optimizePortfolio,
  runPortfolioStressTest,
  type PortfolioOptimizationInput,
  type PortfolioStressScenario,
} from '../../../services/portfolio/PortfolioOptimizationService.js';

function parseHoldings(value: unknown): PortfolioOptimizationInput[] {
  return Array.isArray(value) ? value as PortfolioOptimizationInput[] : [];
}

function parseScenario(value: unknown): PortfolioStressScenario {
  if (!value || typeof value !== 'object') {
    return { name: 'Base Shock', marketShockPct: -10 };
  }
  const candidate = value as Partial<PortfolioStressScenario>;
  return {
    name: typeof candidate.name === 'string' && candidate.name.trim() ? candidate.name.trim() : 'Base Shock',
    marketShockPct: Number.isFinite(candidate.marketShockPct) ? Number(candidate.marketShockPct) : -10,
    sectorShocks: candidate.sectorShocks && typeof candidate.sectorShocks === 'object'
      ? Object.fromEntries(
          Object.entries(candidate.sectorShocks).map(([key, shock]) => [key, Number(shock)]).filter(([, shock]) => Number.isFinite(shock)),
        )
      : undefined,
  };
}

export async function registerPortfolioOptimizationRoutes(app: FastifyInstance) {
  app.post('/api/portfolio/optimize', async (request, reply) => {
    const holdings = parseHoldings((request.body as Record<string, unknown> | null)?.holdings);
    if (holdings.length === 0) {
      return reply.status(400).send({ error: 'holdings array is required' });
    }
    return optimizePortfolio(holdings);
  });

  app.post('/api/portfolio/stress-test', async (request, reply) => {
    const body = (request.body as Record<string, unknown> | null) ?? {};
    const holdings = parseHoldings(body.holdings);
    if (holdings.length === 0) {
      return reply.status(400).send({ error: 'holdings array is required' });
    }
    const scenario = parseScenario(body.scenario);
    return runPortfolioStressTest(holdings, scenario);
  });
}
