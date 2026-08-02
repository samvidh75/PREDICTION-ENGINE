import type { FastifyInstance } from 'fastify';
import {
  alertRuleService,
  type UnifiedAlertEvaluationRequest,
  type UnifiedAlertRuleInput,
} from '../../../services/alerts/AlertRuleService.js';

export async function registerUnifiedAlertsRoutes(app: FastifyInstance) {
  app.post('/api/alerts/create', async (request, reply) => {
    try {
      const rule = alertRuleService.createRule((request.body ?? {}) as UnifiedAlertRuleInput);
      return { success: true, rule };
    } catch (error) {
      return reply.status(400).send({ success: false, error: (error as Error).message });
    }
  });

  app.get('/api/alerts/rules', async (request) => {
    const symbol = typeof (request.query as { symbol?: string } | undefined)?.symbol === 'string'
      ? (request.query as { symbol?: string }).symbol
      : undefined;
    return {
      success: true,
      rules: alertRuleService.listRules(symbol),
    };
  });

  app.post('/api/alerts/evaluate', async (request, reply) => {
    const body = (request.body ?? {}) as Partial<UnifiedAlertEvaluationRequest>;
    if (!body.symbol || typeof body.symbol !== 'string') {
      return reply.status(400).send({ success: false, error: 'symbol is required' });
    }

    return {
      success: true,
      result: alertRuleService.evaluate({
        symbol: body.symbol,
        previousThesisStatus: body.previousThesisStatus ?? null,
        currentThesisStatus: body.currentThesisStatus ?? 'Tracking begins now',
        previousRiskLevel: body.previousRiskLevel ?? null,
        currentRiskLevel: body.currentRiskLevel ?? 'Moderate',
        scoreChange: body.scoreChange ?? null,
        priceChangePercent: body.priceChangePercent ?? null,
        peerBecameMoreAttractive: body.peerBecameMoreAttractive ?? false,
        hasResultEvent: body.hasResultEvent ?? false,
        confidenceState: body.confidenceState,
        marketStateLabel: body.marketStateLabel,
        narrativeKey: body.narrativeKey,
      }),
    };
  });
}
