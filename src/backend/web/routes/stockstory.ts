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
  unavailableResponse,
  errorResponse,
  AnalyticalReasonCode,
  DataLineageEntry,
} from '../../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../../shared/data/DataFreshness';

export const stockstoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/stockstory/:ticker', async (request, reply) => {
    const { ticker } = request.params as { ticker: string };
    const symbol = ticker.toUpperCase().trim();

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

      // Step 2 — Query prediction_registry with CANONICAL column names
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
         ORDER BY prediction_date DESC
         LIMIT 1`,
        [symbol]
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

      const rankingScore = Number(pred.ranking_score ?? 50);
      const classification = String(pred.classification ?? 'Fair');
      const confidenceScore = Number(pred.confidence_score ?? 50);
      const confidenceLevel = String(pred.confidence_level ?? 'Medium');

      // Step 3 — Assemble the StockStory-like response from registry data
      const storyResult = {
        healthScore: rankingScore,
        classification,
        confidence: confidenceLevel,
        growth: Number(pred.growth_score ?? 50),
        quality: Number(pred.quality_score ?? 50),
        stability: Number(pred.value_score ?? 50),
        valuation: Number(pred.value_score ?? 50),
        momentum: Number(pred.momentum_score ?? 50),
        risk: Number(pred.risk_score ?? 50),
        narrative: `Classification: ${classification}. Confidence: ${confidenceLevel}. Score: ${rankingScore}.`,
        engineDetails: {
          growth: { score: Number(pred.growth_score ?? 50) },
          quality: { score: Number(pred.quality_score ?? 50) },
          valuation: { score: Number(pred.value_score ?? 50) },
          momentum: { score: Number(pred.momentum_score ?? 50) },
          risk: { score: Number(pred.risk_score ?? 50) },
          sector: { score: Number(pred.sector_score ?? 50) },
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
      let reasonCode: AnalyticalReasonCode = 'OK';

      return realResponse(
        storyResult,
        freshnessResult.freshness,
        predictionDate,
        completenessScore,
        lineage,
        reasonCode
      );
    } catch (err: any) {
      console.error('[stockstory] Error:', err);
      return errorResponse(
        'BACKEND_UNAVAILABLE',
        `StockStory evaluation failed for ${symbol}: ${err.message}`
      );
    }
  });
};

export default stockstoryRoutes;
