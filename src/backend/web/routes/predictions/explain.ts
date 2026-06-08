/**
 * TRACK-95T — Prediction Explainability API
 * GET /api/predictions/explain/:symbol
 * 
 * Single source of truth for prediction explanations.
 * Returns classification delta, health score changes, factor drivers,
 * and historical reliability pulled from SignalValidationEngine.
 * 
 * Every prediction shown anywhere in the platform is explainable via this endpoint.
 */
import type { FastifyPluginAsync } from 'fastify';
import { predictionExplanationEngine } from '../../../../intelligence/PredictionExplanationEngine';

export const predictionExplainRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/predictions/explain/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const query = request.query as {
      today?: string;
      previous?: string;
    };

    const ticker = symbol.toUpperCase().trim();

    if (!ticker || ticker.length === 0) {
      return reply.status(400).send({
        code: 'INVALID_SYMBOL',
        error: 'Symbol parameter is required.',
      });
    }

    try {
      const explanation = await predictionExplanationEngine.explain(ticker, {
        todayDate: query.today,
        previousDate: query.previous,
      });

      return reply.send({
        symbol: ticker,
        classification: {
          from: explanation.classification.from,
          to: explanation.classification.to,
          changed: explanation.classification.changed,
        },
        healthScore: {
          from: explanation.healthScore.previous,
          to: explanation.healthScore.current,
          delta: explanation.healthScore.delta,
        },
        summary: explanation.summary,
        drivers: explanation.drivers.map(d => ({
          factor: d.factor,
          previous: d.previous,
          current: d.current,
          delta: d.delta,
          percentContribution: d.percentContribution,
          importanceRank: d.importanceRank,
        })),
        positives: explanation.positives,
        negatives: explanation.negatives,
        factorContributions: explanation.factorContributions.map(fc => ({
          factor: fc.factor,
          delta: fc.delta,
          percentContribution: fc.percentContribution,
          importanceRank: fc.importanceRank,
          direction: fc.direction,
        })),
        historicalReliability: explanation.historicalReliability ? {
          signalType: explanation.historicalReliability.signalType,
          successRate: explanation.historicalReliability.successRate,
          sampleSize: explanation.historicalReliability.sampleSize,
          avgAlphaPct: explanation.historicalReliability.avgAlphaPct,
          predictivePower: explanation.historicalReliability.predictivePower,
        } : null,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      const message = err?.message ?? 'Failed to generate prediction explanation.';

      if (message.includes('No prediction found')) {
        return reply.status(404).send({
          code: 'PREDICTION_NOT_FOUND',
          symbol: ticker,
          error: message,
        });
      }

      console.error('[predictions/explain] Error:', err);
      return reply.status(500).send({
        code: 'EXPLANATION_ERROR',
        symbol: ticker,
        error: 'Failed to generate prediction explanation.',
      });
    }
  });
};

export default predictionExplainRoutes;
