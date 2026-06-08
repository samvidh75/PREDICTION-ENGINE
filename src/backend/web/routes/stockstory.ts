/**
 * TRACK-P2 — StockStory API with Analytical Envelope
 * GET /api/stockstory/:ticker
 *
 * Distinguishes:
 *   - Symbol not in universe (symbols table) → HTTP 404
 *   - Symbol exists but no prediction_registry row → 200 with unavailableResponse
 *   - Symbol with prediction → 200 with realResponse envelope
 *
 * NEVER fabricates: company name, confidence level, provider.
 * All responses carry lineage, freshness, completeness, mode, and reason code.
 */
import type { FastifyPluginAsync } from 'fastify';
import pool from '../../../db/index';
import { stockStoryEngine } from '../../../stockstory';
import {
  realResponse,
  unavailableResponse,
  errorResponse,
  AnalyticalReasonCode,
  DataLineageEntry,
} from '../../shared/data/AnalyticalResponse';
import { assessPredictionSnapshotFreshness } from '../../shared/data/DataFreshness';

export const stockstoryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/stockstory/:ticker', async (request, reply) => {
    const { ticker } = request.params as { ticker: string };
    const symbol = ticker.toUpperCase().trim();

    try {
      // ──────────────────────────────────────────────────────────
      // Step 1 — Check if symbol exists in the symbols table
      // ──────────────────────────────────────────────────────────
      const symInfo = await pool.query(
        `SELECT symbol, sector FROM symbols WHERE symbol = $1`,
        [symbol]
      );

      if (symInfo.rows.length === 0) {
        // Genuinely unknown symbol — NOT in the universe
        return reply.status(404).send({
          code: 'SYMBOL_NOT_IN_UNIVERSE',
          symbol,
          error: `Symbol "${symbol}" is not in the supported universe.`,
        });
      }

      const sector = symInfo.rows[0].sector || 'Unknown';

      // ──────────────────────────────────────────────────────────
      // Step 2 — Check prediction_registry for this symbol
      // ──────────────────────────────────────────────────────────
      const predRes = await pool.query(
        `SELECT 
           classification,
           confidence,
           predicted_at,
           health_score,
           factors,
           sample_size
         FROM prediction_registry
         WHERE symbol = $1
         ORDER BY predicted_at DESC
         LIMIT 1`,
        [symbol]
      );

      if (predRes.rows.length === 0) {
        // Symbol exists in universe but has NO prediction_registry row.
        // Return unavailable — not 404.
        return unavailableResponse(
          'PREDICTION_NOT_FOUND',
          `Symbol "${symbol}" is in the universe but has no prediction registry entry.`
        );
      }

      const pred = predRes.rows[0];
      const predictedAt = pred.predicted_at instanceof Date
        ? pred.predicted_at.toISOString()
        : String(pred.predicted_at);
      const predictionDate = predictedAt.split('T')[0];

      // ──────────────────────────────────────────────────────────
      // Step 3 — Fetch feature snapshots
      // ──────────────────────────────────────────────────────────
      const featRes = await pool.query(
        `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
        [symbol]
      );
      const feat = featRes.rows[0];

      // ──────────────────────────────────────────────────────────
      // Step 4 — Fetch factor snapshots
      // ──────────────────────────────────────────────────────────
      const factRes = await pool.query(
        `SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
        [symbol]
      );
      const fact = factRes.rows[0];

      // ──────────────────────────────────────────────────────────
      // Step 5 — Fetch financial snapshots
      // ──────────────────────────────────────────────────────────
      const finRes = await pool.query(
        `SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`,
        [symbol]
      );
      const fin = finRes.rows[0];

      // ──────────────────────────────────────────────────────────
      // Step 6 — Fetch historical features (last 30)
      // ──────────────────────────────────────────────────────────
      const histFeatRes = await pool.query(
        `SELECT trade_date, rsi, macd_histogram, adx, volatility
         FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 30`,
        [symbol]
      );

      // ──────────────────────────────────────────────────────────
      // Step 7 — Fetch historical factors (last 15)
      // ──────────────────────────────────────────────────────────
      const histFactRes = await pool.query(
        `SELECT trade_date, factor_score, quality_factor, risk_factor, growth_factor
         FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 15`,
        [symbol]
      );

      // ──────────────────────────────────────────────────────────
      // Step 8 — Determine reason code based on data completeness
      // ──────────────────────────────────────────────────────────
      let reasonCode: AnalyticalReasonCode = 'OK';

      if (!feat && !fact) {
        reasonCode = 'FEATURE_OR_FACTOR_SNAPSHOT_MISSING';
      } else if (!feat) {
        reasonCode = 'FEATURE_SNAPSHOT_MISSING';
      } else if (!fact) {
        reasonCode = 'FACTOR_SNAPSHOT_MISSING';
      }

      // ──────────────────────────────────────────────────────────
      // Step 9 — Build EngineInputs (PRESERVE existing logic)
      // ──────────────────────────────────────────────────────────
      const engineInputs = {
        symbol,
        tradeDate: fact?.trade_date
          ? (fact.trade_date instanceof Date
              ? fact.trade_date.toISOString().split('T')[0]
              : String(fact.trade_date).split('T')[0])
          : new Date().toISOString().split('T')[0],
        features: {
          rsi: feat?.rsi != null ? Number(feat.rsi) : null,
          macd: feat?.macd != null ? Number(feat.macd) : null,
          macdSignal: feat?.macd_signal != null ? Number(feat.macd_signal) : null,
          macdHistogram: feat?.macd_histogram != null ? Number(feat.macd_histogram) : null,
          adx: feat?.adx != null ? Number(feat.adx) : null,
          atr: feat?.atr != null ? Number(feat.atr) : null,
          bollingerWidth: feat?.bollinger_width != null ? Number(feat.bollinger_width) : null,
          momentum: feat?.momentum != null ? Number(feat.momentum) : null,
          volatility: feat?.volatility != null ? Number(feat.volatility) : null,
          relativeStrength: feat?.relative_strength != null ? Number(feat.relative_strength) : null,
          movingAverageDistance: feat?.moving_average_distance != null ? Number(feat.moving_average_distance) : null,
          trendStrength: feat?.trend_strength != null ? Number(feat.trend_strength) : null,
        },
        factors: {
          qualityFactor: fact ? Number(fact.quality_factor) : 50,
          valueFactor: fact ? Number(fact.value_factor) : 50,
          growthFactor: fact ? Number(fact.growth_factor) : 50,
          momentumFactor: fact ? Number(fact.momentum_factor) : 50,
          riskFactor: fact ? Number(fact.risk_factor) : 50,
          sectorStrengthFactor: fact ? Number(fact.sector_strength_factor) : 50,
          factorScore: fact ? Number(fact.factor_score) : 50,
        },
        financials: {
          peRatio: fin?.pe_ratio != null ? Number(fin.pe_ratio) : null,
          pbRatio: fin?.pb_ratio != null ? Number(fin.pb_ratio) : null,
          eps: fin?.eps != null ? Number(fin.eps) : null,
          dividendYield: fin?.dividend_yield != null ? Number(fin.dividend_yield) : null,
          beta: fin?.beta != null ? Number(fin.beta) : null,
          marketCap: fin?.market_cap != null ? Number(fin.market_cap) : null,
          freeFloat: fin?.free_float != null ? Number(fin.free_float) : null,
          fcfYield: fin?.fcf_yield != null ? Number(fin.fcf_yield) : null,
          evEbitda: fin?.ev_ebitda != null ? Number(fin.ev_ebitda) : null,
          roa: fin?.roa != null ? Number(fin.roa) : null,
          roe: fin?.roe != null ? Number(fin.roe) : null,
          roic: fin?.roic != null ? Number(fin.roic) : null,
          debtToEquity: fin?.debt_to_equity != null ? Number(fin.debt_to_equity) : null,
          currentRatio: fin?.current_ratio != null ? Number(fin.current_ratio) : null,
          revenueGrowth: fin?.revenue_growth != null ? Number(fin.revenue_growth) : null,
          profitGrowth: fin?.profit_growth != null ? Number(fin.profit_growth) : null,
          epsGrowth: fin?.eps_growth != null ? Number(fin.eps_growth) : null,
          fcfGrowth: fin?.fcf_growth != null ? Number(fin.fcf_growth) : null,
          grossMargin: fin?.gross_margin != null ? Number(fin.gross_margin) : null,
          operatingMargin: fin?.operating_margin != null ? Number(fin.operating_margin) : null,
        },
        historical: {
          featureHistory: histFeatRes.rows.map(r => ({
            tradeDate: r.trade_date instanceof Date ? r.trade_date.toISOString().split('T')[0] : String(r.trade_date).split('T')[0],
            rsi: r.rsi != null ? Number(r.rsi) : 50,
            macdHistogram: r.macd_histogram != null ? Number(r.macd_histogram) : 0,
            adx: r.adx != null ? Number(r.adx) : 25,
            volatility: r.volatility != null ? Number(r.volatility) : 0.25,
          })),
          factorHistory: histFactRes.rows.map(r => ({
            tradeDate: r.trade_date instanceof Date ? r.trade_date.toISOString().split('T')[0] : String(r.trade_date).split('T')[0],
            factorScore: Number(r.factor_score),
            qualityFactor: Number(r.quality_factor),
            riskFactor: Number(r.risk_factor),
            growthFactor: Number(r.growth_factor),
          })),
        },
        sector: {
          name: sector,
          sectorStrength: fact?.sector_strength_factor != null ? Number(fact.sector_strength_factor) : 50,
          sectorMomentum: 'Steady' as const,
        },
      };

      // ──────────────────────────────────────────────────────────
      // Step 10 — Run StockStory engine
      // ──────────────────────────────────────────────────────────
      const storyResult = stockStoryEngine.evaluate(engineInputs);

      // ──────────────────────────────────────────────────────────
      // Step 11 — Assess freshness from prediction_registry date
      // ──────────────────────────────────────────────────────────
      const freshnessResult = assessPredictionSnapshotFreshness(predictionDate);

      // ──────────────────────────────────────────────────────────
      // Step 12 — Compute completeness
      // ──────────────────────────────────────────────────────────
      const requiredFields = ['predicted_at', 'classification', 'health_score', 'factors'];
      const values: Record<string, unknown> = {
        predicted_at: predictedAt,
        classification: pred.classification,
        health_score: pred.health_score,
        factors: pred.factors,
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
      // Step 13 — Build lineage (honest: source is prediction_registry)
      // ──────────────────────────────────────────────────────────
      const lineage: DataLineageEntry[] = [
        {
          sourceTable: 'prediction_registry',
          sourceField: 'classification',
          asOf: predictedAt,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
          notes: `Prediction for ${symbol} at ${predictionDate}`,
        },
        {
          sourceTable: 'prediction_registry',
          sourceField: 'health_score',
          asOf: predictedAt,
          retrievedAt: new Date().toISOString(),
          isFallback: false,
          isSynthetic: false,
        },
        {
          sourceTable: 'feature_snapshots',
          asOf: feat?.trade_date ? String(feat.trade_date).split('T')[0] : null,
          retrievedAt: new Date().toISOString(),
          isFallback: !feat,
          isSynthetic: false,
          notes: feat ? 'Latest feature snapshot' : 'Feature snapshot unavailable',
        },
        {
          sourceTable: 'factor_snapshots',
          asOf: fact?.trade_date ? String(fact.trade_date).split('T')[0] : null,
          retrievedAt: new Date().toISOString(),
          isFallback: !fact,
          isSynthetic: false,
          notes: fact ? 'Latest factor snapshot' : 'Factor snapshot unavailable',
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
        {
          sourceTable: 'financial_snapshots',
          asOf: fin?.period_end ? String(fin.period_end).split('T')[0] : null,
          retrievedAt: new Date().toISOString(),
          isFallback: !fin,
          isSynthetic: false,
          notes: fin ? 'Latest financial snapshot' : 'Financial snapshot unavailable',
        },
      ];

      // ──────────────────────────────────────────────────────────
      // Step 14 — Wrap in the analytical envelope
      // ──────────────────────────────────────────────────────────
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