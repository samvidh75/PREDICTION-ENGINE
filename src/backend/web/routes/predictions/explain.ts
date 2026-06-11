/**
 * TRACK-P2 — Prediction Explainability API with Analytical Envelope
 * GET /api/predictions/explain/:symbol
 *
 * Single source of truth for prediction explanations.
 * Returns classification delta, health score changes, factor drivers,
 * and historical reliability pulled from SignalValidationEngine.
 *
 * Every prediction shown anywhere in the platform is explainable via this endpoint.
 *
 * Envelope logic:
 *   - No prediction found → unavailableResponse with PREDICTION_NOT_FOUND
 *   - Prediction found → realResponse with lineage, freshness, completeness
 *
 * Validation-limited states:
 *   - When sampleSize < 30 → reason = VALIDATION_LIMITED, no definitive reliability claims
 *   - Validation availability is explicitly labeled
 */
import type { FastifyPluginAsync } from 'fastify';
import pool from '../../../../db/index';
import { predictionExplanationEngine } from '../../../../intelligence/PredictionExplanationEngine';
import {
  realResponse,
  unavailableResponse,
  errorResponse,
  AnalyticalReasonCode,
  DataLineageEntry,
} from '../../../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../../../shared/data/DataFreshness';
import { parsePredictionHorizon, SUPPORTED_PREDICTION_HORIZONS } from '../../../../shared/predictions/horizons';

export const predictionExplainRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/predictions/explain/:symbol', async (request, reply) => {
    const { symbol } = request.params as { symbol: string };
    const query = request.query as {
      today?: string;
      previous?: string;
      horizon?: string;
    };

    const ticker = symbol.toUpperCase().trim();

    if (!ticker || ticker.length === 0) {
      return reply.status(400).send({
        code: 'INVALID_SYMBOL',
        error: 'Symbol parameter is required.',
      });
    }
    const horizon = parsePredictionHorizon(query.horizon);
    if (horizon === null) {
      return reply.status(400).send({
        code: 'INVALID_PREDICTION_HORIZON',
        message: `Horizon ${query.horizon} is not valid. Allowed: ${SUPPORTED_PREDICTION_HORIZONS.join(', ')}`,
      });
    }

    try {
      const explanation = await predictionExplanationEngine.explain(ticker, {
        todayDate: query.today,
        previousDate: query.previous,
        horizonDays: horizon,
      });

      // ──────────────────────────────────────────────────────────
      // Determine reason code
      // ──────────────────────────────────────────────────────────
      let reasonCode: AnalyticalReasonCode = 'OK';

      // If sample size from historical reliability is below 30,
      // label as VALIDATION_LIMITED — avoid definitive claims
      if (explanation.historicalReliability) {
        if (explanation.historicalReliability.sampleSize < 30) {
          reasonCode = 'VALIDATION_LIMITED';
        }
      } else {
        // No historical reliability data at all → validation-limited
        reasonCode = 'VALIDATION_LIMITED';
      }

      // ──────────────────────────────────────────────────────────
      // Get prediction date from DB for freshness & lineage
      // ──────────────────────────────────────────────────────────
      const today = query.today ?? new Date().toISOString().split('T')[0];
      let predictionDate: string | null = null;
      try {
        const pdRes = await pool.query(
          `SELECT prediction_date FROM prediction_registry
           WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3
           LIMIT 1`,
          [ticker, today, horizon]
        );
        if (pdRes.rows.length > 0) {
          const pd = pdRes.rows[0].prediction_date;
          predictionDate = pd instanceof Date
            ? pd.toISOString().split('T')[0]
            : String(pd).split('T')[0];
        }
      } catch {
        predictionDate = null;
      }

      // ──────────────────────────────────────────────────────────
      // Assess freshness
      // ──────────────────────────────────────────────────────────
      const freshnessResult = assessPredictionSnapshotFreshness(predictionDate);

      // ──────────────────────────────────────────────────────────
      // Compute completeness
      // ──────────────────────────────────────────────────────────
      const requiredFields = [
        'classification.from',
        'classification.to',
        'healthScore.from',
        'healthScore.to',
        'drivers',
        'summary',
      ];
      const values: Record<string, unknown> = {
        'classification.from': explanation.classification?.from,
        'classification.to': explanation.classification?.to,
        'healthScore.from': explanation.healthScore?.previous,
        'healthScore.to': explanation.healthScore?.current,
        'drivers': explanation.drivers,
        'summary': explanation.summary,
      };
      const missingFields = requiredFields.filter(f => {
        const v = values[f];
        return v === null || v === undefined || v === '';
      });
      const availableFields = requiredFields.length - missingFields.length;
      const completenessScore = requiredFields.length > 0
        ? Math.round((availableFields / requiredFields.length) * 100)
        : 100;

      // ──────────────────────────────────────────────────────────
      // Build lineage
      // ──────────────────────────────────────────────────────────
      // TRACK-P4B: Use CANONICAL column names in lineage
      const lineage: DataLineageEntry[] = [
        {
          sourceTable: 'prediction_registry',
          sourceField: 'classification',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Horizon: ${horizon}d`,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'ranking_score',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Horizon: ${horizon}d`,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'confidence_score',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Horizon: ${horizon}d`,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'quality_score, growth_score, value_score, momentum_score, risk_score, sector_score',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: explanation.historicalReliability
            ? `Validation sample size: ${explanation.historicalReliability.sampleSize}; horizon: ${horizon}d`
            : `No historical validation available for horizon: ${horizon}d`,
        },
      ];

      // ──────────────────────────────────────────────────────────
      // Build neutralized fields list for validation-limited scenarios
      // ──────────────────────────────────────────────────────────
      const neutralizedFields: string[] = [];
      if (reasonCode === 'VALIDATION_LIMITED') {
        neutralizedFields.push('historicalReliability.predictivePower');
        neutralizedFields.push('historicalReliability.avgAlphaPct');
      }

      // ──────────────────────────────────────────────────────────
      // Build payload (PRESERVE exact same shape as before)
      // ──────────────────────────────────────────────────────────
      const payload = {
        symbol: ticker,
        horizon,
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
          // Label when validation is limited
          ...(reasonCode === 'VALIDATION_LIMITED'
            ? {
                _validationNote:
                  explanation.historicalReliability.sampleSize < 30
                    ? `Sample size (${explanation.historicalReliability.sampleSize}) is below the 30-observation threshold for definitive reliability claims. Historical success rates and alpha estimates should be interpreted with caution.`
                    : 'Historical validation data is unavailable. Reliability estimates should be treated as preliminary.',
              }
            : {}),
        } : null,
        generatedAt: new Date().toISOString(),
      };

      // ──────────────────────────────────────────────────────────
      // Wrap in analytical envelope
      // ──────────────────────────────────────────────────────────
      return realResponse(
        payload,
        freshnessResult.freshness,
        freshnessResult.asOf,
        completenessScore,
        lineage,
        reasonCode,
        neutralizedFields
      );
    } catch (err: any) {
      const message = err?.message ?? 'Failed to generate prediction explanation.';

      if (message.includes('No prediction found')) {
        return unavailableResponse(
          'PREDICTION_NOT_FOUND',
          message,
          ['prediction_registry', 'symbol']
        );
      }

      console.error('[predictions/explain] Error:', err);
      return errorResponse(
        'BACKEND_UNAVAILABLE',
        `Failed to generate prediction explanation for ${ticker}: ${message}`
      );
    }
  });
};

export default predictionExplainRoutes;
