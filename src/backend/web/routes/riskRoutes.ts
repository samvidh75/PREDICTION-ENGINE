import type { FastifyInstance } from 'fastify';
import { valueAtRiskEngine, type VaRInput, type StressTestScenario } from '../../../services/risk/ValueAtRiskEngine.js';
import { sebiComplianceService } from '../../../services/risk/SeBiComplianceService.js';
import { greeksEngine, type PositionForGreeks } from '../../../engines/GreeksEngine.js';

function parseVaRInput(body: unknown): VaRInput | null {
  const payload = (body ?? {}) as Record<string, unknown>;
  const positions = payload.positions;
  if (!Array.isArray(positions) || positions.length === 0) return null;
  return {
    portfolioValue: Number(payload.portfolioValue ?? 1000000),
    confidenceLevel: Number(payload.confidenceLevel ?? 0.95),
    timeHorizon: Number(payload.timeHorizon ?? 1),
    positions: positions.map((p: Record<string, unknown>) => ({
      symbol: String(p.symbol ?? ''),
      weight: Number(p.weight ?? 0),
      volatility: Number(p.volatility ?? 0.2),
      expectedReturn: Number(p.expectedReturn ?? 0),
    })),
  };
}

function parseStressScenarios(body: unknown): StressTestScenario[] {
  const payload = (body ?? {}) as Record<string, unknown>;
  const scenarios = payload.scenarios;
  if (!Array.isArray(scenarios)) {
    return [
      { name: 'Market Crash', marketShock: -0.15, volMultiplier: 2, correlationShift: 0.3 },
      { name: 'Mild Correction', marketShock: -0.05, volMultiplier: 1.3, correlationShift: 0.1 },
      { name: 'Bull Run', marketShock: 0.10, volMultiplier: 0.8, correlationShift: -0.1 },
    ];
  }
  return scenarios.map((s: Record<string, unknown>) => ({
    name: String(s.name ?? 'Custom Scenario'),
    marketShock: Number(s.marketShock ?? -0.1),
    volMultiplier: Number(s.volMultiplier ?? 1.5),
    correlationShift: Number(s.correlationShift ?? 0.2),
  }));
}

function parsePositions(body: unknown): PositionForGreeks[] {
  const payload = (body ?? {}) as Record<string, unknown>;
  const positions = payload.positions;
  if (!Array.isArray(positions)) return [];
  return positions.map((p: Record<string, unknown>) => ({
    symbol: String(p.symbol ?? ''),
    spotPrice: Number(p.spotPrice ?? 0),
    strike: Number(p.strike ?? 0),
    timeToExpiry: Number(p.timeToExpiry ?? 0),
    volatility: Number(p.volatility ?? 0.2),
    optionType: p.optionType as 'call' | 'put',
    riskFreeRate: Number(p.riskFreeRate ?? 0.065),
    quantity: Number(p.quantity ?? 1),
    positionType: p.positionType as 'long' | 'short',
  }));
}

export async function registerRiskRoutes(app: FastifyInstance) {
  app.get('/api/risk/var', async (request, reply) => {
    const input = parseVaRInput(request.body);
    if (!input) {
      return reply.status(400).send({ error: 'positions array required' });
    }
    return valueAtRiskEngine.computeVaR(input);
  });

  app.post('/api/risk/stress-scenario', async (request, reply) => {
    const input = parseVaRInput(request.body);
    if (!input) {
      return reply.status(400).send({ error: 'positions array required' });
    }
    const scenarios = parseStressScenarios(request.body);
    return valueAtRiskEngine.runStressTest(input, scenarios);
  });

  app.get('/api/risk/compliance', async (_request, _reply) => {
    return sebiComplianceService.runComplianceCheck();
  });

  app.get('/api/risk/compliance/audit-log', async (request, _reply) => {
    const query = request.query as Record<string, string>;
    return sebiComplianceService.queryAuditLog({
      userId: query.userId,
      action: query.action,
      limit: Number(query.limit ?? 100),
    });
  });

  app.get('/api/portfolio/greeks', async (request, reply) => {
    const positions = parsePositions(request.body);
    if (positions.length === 0) {
      return reply.status(400).send({ error: 'positions array required' });
    }
    return greeksEngine.computePortfolioGreeks(positions);
  });

  app.post('/api/portfolio/risk-decompose', async (request, reply) => {
    const positions = parsePositions(request.body);
    if (positions.length === 0) {
      return reply.status(400).send({ error: 'positions array required' });
    }
    return greeksEngine.computeRiskDecomposition(positions);
  });
}
