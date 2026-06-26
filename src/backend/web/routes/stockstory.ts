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
import { healthometerEngine } from '../../../stockstory/healthometer/HealthometerEngine';
import type { HealthometerScore } from '../../../stockstory/healthometer/types';
import { evaluateMarketBrainInput, toMarketBrainResearchView } from '../../../systems/market-brain';

const asFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

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
           AND classification IN ('Exceptional', 'Excellent', 'Good', 'Fair', 'Weak', 'Critical', 'Healthy', 'Stable', 'Weakening', 'At Risk')
           AND ranking_score BETWEEN 0 AND 100
           AND confidence_score BETWEEN 0 AND 100
           AND quality_score BETWEEN 0 AND 100
           AND growth_score BETWEEN 0 AND 100
           AND value_score BETWEEN 0 AND 100
           AND momentum_score BETWEEN 0 AND 100
           AND risk_score BETWEEN 0 AND 100
           AND sector_score BETWEEN 0 AND 100
           AND (price_at_prediction > 0 OR price_at_prediction IS NULL)
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

      // ── Healthometer v2 (additive) ────────────────────────────────
      let healthometerResult: HealthometerScore | null = null;
      try {
        const [fsRes, factorRes, featureRes] = await Promise.all([
          pool.query(
            `SELECT pe_ratio, pb_ratio, ev_ebitda, roe, roce, roa,
                    debt_to_equity, current_ratio, operating_margin,
                    net_margin, gross_margin, revenue_growth, profit_growth,
                    eps_growth, fcf_yield, market_cap, beta,
                    dividend_yield, eps
             FROM financial_snapshots
              WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
                AND pe_ratio IS NOT NULL
              ORDER BY snapshot_date DESC LIMIT 1`,
            [symbol]
          ),
          pool.query(
            `SELECT quality_factor, value_factor, growth_factor,
                    momentum_factor, risk_factor, sector_strength_factor
             FROM factor_snapshots
             WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
             ORDER BY trade_date DESC LIMIT 1`,
            [symbol]
          ),
          pool.query(
            `SELECT volatility, momentum, rsi, trend_strength
             FROM feature_snapshots
             WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
             ORDER BY trade_date DESC LIMIT 1`,
            [symbol]
          ),
        ]);
        const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
        const factorRow = (factorRes.rows?.[0] || null) as Record<string, unknown> | null;
        const featureRow = (featureRes.rows?.[0] || null) as Record<string, unknown> | null;
        if (fsRow || factorRow || featureRow) {
          const input = {
            symbol,
            financials: {
              peRatio: asFiniteNumber(fsRow?.pe_ratio),
              pbRatio: asFiniteNumber(fsRow?.pb_ratio),
              evEbitda: asFiniteNumber(fsRow?.ev_ebitda),
              roe: asFiniteNumber(fsRow?.roe),
              roce: asFiniteNumber(fsRow?.roce),
              roa: asFiniteNumber(fsRow?.roa),
              debtToEquity: asFiniteNumber(fsRow?.debt_to_equity),
              currentRatio: asFiniteNumber(fsRow?.current_ratio),
              operatingMargin: asFiniteNumber(fsRow?.operating_margin),
              netMargin: asFiniteNumber(fsRow?.net_margin),
              grossMargin: asFiniteNumber(fsRow?.gross_margin),
              revenueGrowth: asFiniteNumber(fsRow?.revenue_growth),
              profitGrowth: asFiniteNumber(fsRow?.profit_growth),
              epsGrowth: asFiniteNumber(fsRow?.eps_growth),
              fcfYield: asFiniteNumber(fsRow?.fcf_yield),
              marketCap: asFiniteNumber(fsRow?.market_cap),
              beta: asFiniteNumber(fsRow?.beta),
              dividendYield: asFiniteNumber(fsRow?.dividend_yield),
              eps: asFiniteNumber(fsRow?.eps),
            },
            factors: {
              qualityFactor: asFiniteNumber(factorRow?.quality_factor),
              valueFactor: asFiniteNumber(factorRow?.value_factor),
              growthFactor: asFiniteNumber(factorRow?.growth_factor),
              momentumFactor: asFiniteNumber(factorRow?.momentum_factor),
              riskFactor: asFiniteNumber(factorRow?.risk_factor),
              sectorStrengthFactor: asFiniteNumber(factorRow?.sector_strength_factor),
            },
            features: {
              volatility: asFiniteNumber(featureRow?.volatility),
              momentum: asFiniteNumber(featureRow?.momentum),
              rsi: asFiniteNumber(featureRow?.rsi),
              trendStrength: asFiniteNumber(featureRow?.trend_strength),
            },
            predictionRegistry: {
              rankingScore,
              classification,
              confidenceScore,
              confidenceLevel,
            },
          };
          healthometerResult = healthometerEngine.evaluate(input);
        }
      } catch {
        // Healthometer is additive; failure does not block the response
      }

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
        healthometer: healthometerResult ? {
          overallScore: healthometerResult.overallScore,
          label: healthometerResult.label,
          dimensions: healthometerResult.dimensions.map((d) => ({
            id: d.id,
            label: d.label,
            score: d.score,
            status: d.status,
          })),
        } : null,
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

  app.get('/api/stockstory/:ticker/research', async (request, reply) => {
    const log = request.log;
    const { ticker } = request.params as { ticker: string };
    const symbol = ticker.toUpperCase().trim();

    try {
      const symInfo = await pool.query(
        `SELECT symbol, sector FROM symbols WHERE symbol = $1`,
        [symbol]
      );

      if (symInfo.rows.length === 0) {
        return reply.status(404).send({
          code: 'SYMBOL_NOT_IN_UNIVERSE',
          symbol,
          message: 'This company is not available in the research universe yet.',
        });
      }

      const sector = symInfo.rows[0].sector || 'General';
      const [financialRes, featureRes] = await Promise.all([
        pool.query(
          `SELECT pe_ratio, pb_ratio, ev_ebitda, roe, roa, roce,
                  debt_to_equity, current_ratio, operating_margin,
                  revenue_growth, profit_growth, fcf_yield,
                  market_cap, dividend_yield
           FROM financial_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY snapshot_date DESC LIMIT 1`,
          [symbol]
        ),
        pool.query(
          `SELECT volatility, momentum, rsi, trend_strength
           FROM feature_snapshots
           WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
           ORDER BY trade_date DESC LIMIT 1`,
          [symbol]
        ),
      ]);

      const financials = (financialRes.rows?.[0] || null) as Record<string, unknown> | null;
      const features = (featureRes.rows?.[0] || null) as Record<string, unknown> | null;
      const result = evaluateMarketBrainInput(
        {
          symbol,
          sector: { name: sector },
          financials: {
            peRatio: asFiniteNumber(financials?.pe_ratio),
            pbRatio: asFiniteNumber(financials?.pb_ratio),
            evEbitda: asFiniteNumber(financials?.ev_ebitda),
            roe: asFiniteNumber(financials?.roe),
            roa: asFiniteNumber(financials?.roa),
            roic: asFiniteNumber(financials?.roce),
            debtToEquity: asFiniteNumber(financials?.debt_to_equity),
            currentRatio: asFiniteNumber(financials?.current_ratio),
            operatingMargin: asFiniteNumber(financials?.operating_margin),
            revenueGrowth: asFiniteNumber(financials?.revenue_growth),
            profitGrowth: asFiniteNumber(financials?.profit_growth),
            fcfYield: asFiniteNumber(financials?.fcf_yield),
            marketCap: asFiniteNumber(financials?.market_cap),
            dividendYield: asFiniteNumber(financials?.dividend_yield),
          },
          features: {
            volatility: asFiniteNumber(features?.volatility),
            momentum: asFiniteNumber(features?.momentum),
            rsi: asFiniteNumber(features?.rsi),
            trendStrength: asFiniteNumber(features?.trend_strength),
          },
        },
        {
          name: symbol,
          sector,
        }
      );

      return reply.send({
        symbol,
        companyName: result.companyName,
        research: toMarketBrainResearchView(result),
      });
    } catch (err: any) {
      log.error({ err, symbol }, 'market brain research failed');
      return reply.status(503).send({
        code: 'RESEARCH_TEMPORARILY_UNAVAILABLE',
        symbol,
        message: 'Research is temporarily unavailable for this company.',
      });
    }
  });
};

export default stockstoryRoutes;
