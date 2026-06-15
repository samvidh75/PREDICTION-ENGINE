/**
 * TRACK-P4B — StockStory API with Analytical Envelope (FIXED)
 * GET /api/stockstory/:ticker
 *
 * Uses CANONICAL prediction_registry column names:
 *   ranking_score, classification, confidence_score, confidence_level,
 *   quality_score, growth_score, value_score, momentum_score,
 *   risk_score, sector_score, prediction_date
 *
 * OBsolete field names REMOVED: health_score, predicted_at, confidence,
 *   factors, sample_size
 */
import type { FastifyPluginAsync } from 'fastify';
import pool from '../../../db/index';
import {
  realResponse,
  partialResponse,
  unavailableResponse,
  errorResponse,
  AnalyticalReasonCode,
  DataLineageEntry,
} from '../../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../../shared/data/DataFreshness';

export const stockstoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/stockstory/:ticker', async (request, reply) => {
    const log = request.log;
    const { ticker } = request.params as { ticker: string };
    const query = request.query as { horizon?: string };
    const symbol = ticker.toUpperCase().trim();
    const VALID_HORIZONS = [7, 30, 90, 180, 365];
    const horizon = query.horizon ? parseInt(query.horizon, 10) : 30;
    if (!VALID_HORIZONS.includes(horizon)) {
      return reply.status(400).send({
        code: 'INVALID_PREDICTION_HORIZON',
        message: `Horizon ${query.horizon} is not valid. Allowed: ${VALID_HORIZONS.join(', ')}`,
      });
    }
    const asFiniteNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };

    try {
      // Step 1 — Check if symbol exists in the symbols table
      const symInfo = await pool.query(
        `SELECT symbol, sector FROM symbols WHERE symbol = $1`,
        [symbol]
      );

      if (symInfo.rows.length === 0) {
        return reply.status(404).send({
          code: 'SYMBOL_NOT_IN_UNIVERSE',
          symbol,
          error: `Symbol "${symbol}" is not in the supported universe.`,
        });
      }

      const sector = symInfo.rows[0].sector || 'Unknown';

      // Step 2 — Query prediction_registry with horizon filter
      const predRes = await pool.query(
        `SELECT 
           symbol,
           prediction_date,
           ranking_score,
           classification,
           confidence_score,
           confidence_level,
           quality_score,
           growth_score,
           value_score,
           momentum_score,
           risk_score,
           sector_score,
           price_at_prediction,
           benchmark_level,
           prediction_horizon
         FROM prediction_registry
         WHERE symbol = $1
           AND prediction_horizon = $2
           AND classification IN ('Exceptional', 'Excellent', 'Good', 'Fair', 'Weak', 'Critical')
           AND ranking_score BETWEEN 0 AND 100
           AND confidence_score BETWEEN 0 AND 100
           AND quality_score BETWEEN 0 AND 100
           AND growth_score BETWEEN 0 AND 100
           AND value_score BETWEEN 0 AND 100
           AND momentum_score BETWEEN 0 AND 100
           AND risk_score BETWEEN 0 AND 100
           AND sector_score BETWEEN 0 AND 100
           AND price_at_prediction > 0
         ORDER BY prediction_date DESC
         LIMIT 1`,
        [symbol, horizon]
      );

      if (predRes.rows.length === 0) {
        return unavailableResponse(
          'PREDICTION_NOT_FOUND',
          `Symbol "${symbol}" is in the universe but has no prediction registry entry.`
        );
      }

      const pred = predRes.rows[0] as Record<string, unknown>;
      const predictionDate = pred.prediction_date instanceof Date
        ? (pred.prediction_date as Date).toISOString().split('T')[0]
        : String(pred.prediction_date ?? '');

      const rankingScore = asFiniteNumber(pred.ranking_score);
      const classification = pred.classification ? String(pred.classification) : null;
      const confidenceScore = asFiniteNumber(pred.confidence_score);
      const confidenceLevel = pred.confidence_level ? String(pred.confidence_level) : null;
      const qualityScore = asFiniteNumber(pred.quality_score);
      const growthScore = asFiniteNumber(pred.growth_score);
      const valueScore = asFiniteNumber(pred.value_score);
      const momentumScore = asFiniteNumber(pred.momentum_score);
      const riskScore = asFiniteNumber(pred.risk_score);
      const sectorScore = asFiniteNumber(pred.sector_score);

      const factorSnapshot = (score: number | null, sourceField: string) => ({
        score,
        source: 'prediction_registry',
        sourceField,
        snapshotDate: predictionDate || null,
      });

      // Step 3 — Assemble the StockStory-like response from registry data
      const storyResult = {
        symbol,
        predictionDate,
        predictionHorizon: asFiniteNumber(pred.prediction_horizon),
        rankingScore,
        healthScore: rankingScore,
        classification,
        confidence: {
          level: confidenceLevel,
          score: confidenceScore,
          source: 'prediction_registry',
          sourceField: 'confidence_score',
          snapshotDate: predictionDate || null,
        },
        confidenceLevel,
        confidenceScore,
        dataFreshness: null,
        sector,
        growth: growthScore,
        quality: qualityScore,
        stability: null,
        stabilityAvailability: 'unavailable',
        valuation: valueScore,
        momentum: momentumScore,
        risk: riskScore,
        narrative: classification && confidenceLevel && rankingScore !== null
          ? `Classification: ${classification}. Confidence: ${confidenceLevel}. Score: ${rankingScore}.`
          : `Prediction registry snapshot for ${symbol} is incomplete. Missing values are shown as unavailable.`,
        factors: {
          growth: factorSnapshot(growthScore, 'growth_score'),
          quality: factorSnapshot(qualityScore, 'quality_score'),
          stability: { score: null, source: 'prediction_registry', sourceField: 'stability', snapshotDate: predictionDate || null, availability: 'unavailable' as const },
          value: factorSnapshot(valueScore, 'value_score'),
          momentum: factorSnapshot(momentumScore, 'momentum_score'),
          risk: factorSnapshot(riskScore, 'risk_score'),
          sector: factorSnapshot(sectorScore, 'sector_score'),
        },
        engineDetails: {
          growth: { score: growthScore },
          quality: { score: qualityScore },
          stability: { score: null, availability: 'unavailable' as const },
          valuation: { score: valueScore },
          momentum: { score: momentumScore },
          risk: { score: riskScore },
          sector: { score: sectorScore },
        },
      };

      // Step 4 — Assess freshness
      const freshnessResult = assessPredictionSnapshotFreshness(predictionDate);

      // Step 5 — Compute completeness using canonical fields
      const requiredFields = ['prediction_date', 'ranking_score', 'classification',
        'confidence_score', 'confidence_level', 'quality_score', 'growth_score',
        'value_score', 'momentum_score', 'risk_score', 'sector_score'];
      const availableFields = requiredFields.filter(f => {
        const v = pred[f];
        return v !== null && v !== undefined && v !== '';
      });
      const missingFields = requiredFields.filter(f => !availableFields.includes(f));
      const completenessScore = Math.round((availableFields.length / requiredFields.length) * 100);

      // Step 6 — Build honest lineage
      const lineage: DataLineageEntry[] = [
        {
          sourceTable: 'prediction_registry',
          sourceField: 'ranking_score',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Prediction for ${symbol} on ${predictionDate}`,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'classification',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'confidence_score',
          asOf: predictionDate,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
        },
        {
          sourceTable: 'symbols',
          sourceField: 'sector',
          asOf: null,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Sector: ${sector}`,
        },
      ];

      // Step 7 — Determine reason code
      const reasonCode: AnalyticalReasonCode = 'OK';

      if (missingFields.length > 0) {
        return partialResponse(
          'PARTIAL_DATA',
          `Prediction registry snapshot for ${symbol} is missing: ${missingFields.join(', ')}.`,
          storyResult,
          missingFields,
          completenessScore,
          lineage,
          predictionDate
        );
      }

      return realResponse(
        { ...storyResult, dataFreshness: freshnessResult.freshness },
        freshnessResult.freshness,
        predictionDate,
        completenessScore,
        lineage,
        reasonCode
      );
    } catch (err: any) {
      log.error({ err, symbol }, 'stockstory evaluation failed');
      return errorResponse(
        'BACKEND_UNAVAILABLE',
        `StockStory evaluation is temporarily unavailable for ${symbol}.`
      );
    }
  });
};

export default stockstoryRoutes;
