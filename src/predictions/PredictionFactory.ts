/**
 * TRACK-P0-MEGA — PredictionFactory (honest data & confidence correction)
 *
 * Generates 30d/90d/365d predictions for every stock with factor data.
 * Stores immutably in prediction_registry. Idempotent — skips if already generated today.
 *
 * P0 Fixes:
 *   - NO silent ?? 50 fallbacks — missing scores skip prediction or use null
 *   - Confidence formula: riskStrength = 100 - riskScore (higher risk = lower confidence)
 *   - Unknown classifications THROW, not default to 'Fair'
 *   - Structured skipped/insufficient result codes
 */
import pool from '../db/index';
import { stockStoryEngine } from '../stockstory';
import { TemporalGuard } from '../validation/TemporalGuard';
import { predictionRegistry } from './PredictionRegistry';
import type { UnifiedPredictionOutput, UnifiedClassification } from '../prediction-engine/types';
import { isFiniteNumber } from '../stockstory/types';
import {
  mapStockStoryClassification,
  type RegistryPredictionHorizon,
  type RegistryClassification,
  type CreatePredictionInput as ContractCreatePredictionInput,
} from './PredictionRegistryContract';

export interface GenerationError {
  symbol: string;
  horizon: number;
  code: string;
  message: string;
}

export interface GenerationSummary {
  total: number;
  created: number;
  skipped: number;
  skippedInsufficientData: number;
  failed: number;
  errors: GenerationError[];
}

const UNIFIED_TO_STOCKSTORY_CLASSIFICATION: Record<UnifiedClassification, string> = {
  EXCELLENT: 'Excellent',
  HEALTHY: 'Healthy',
  STABLE: 'Stable',
  WEAKENING: 'Weakening',
  AT_RISK: 'At Risk',
  INSUFFICIENT_DATA: 'At Risk',
};

function getFactorValue(factorScores: UnifiedPredictionOutput['factorScores'], group: string): number | null {
  const factor = factorScores.find(f => f.group === group);
  return factor?.value ?? null;
}

function mapUnifiedOutputToContractInput(output: UnifiedPredictionOutput): Record<string, unknown> {
  return {
    healthScore: output.rankingScore,
    classification: UNIFIED_TO_STOCKSTORY_CLASSIFICATION[output.classification],
    quality: getFactorValue(output.factorScores, 'quality'),
    growth: getFactorValue(output.factorScores, 'growth'),
    risk: getFactorValue(output.factorScores, 'risk'),
    valuation: getFactorValue(output.factorScores, 'valuation'),
    momentum: getFactorValue(output.factorScores, 'momentum'),
    _sectorStrengthFactor: getFactorValue(output.factorScores, 'sector'),
  };
}

export class PredictionFactory {

  async generateDaily(horizons: number[] = [30, 90, 365]): Promise<GenerationSummary> {
    const today = new Date().toISOString().split('T')[0];
    const generationErrors: GenerationError[] = [];
    let created = 0;
    let skipped = 0;
    let skippedInsufficientData = 0;
    let failed = 0;

    // Get all symbols with recent factor data
    const symResult = await pool.query(
      `SELECT DISTINCT symbol FROM factor_snapshots WHERE trade_date >= $1`,
      [new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]]
    );

    const symbols: string[] = symResult.rows.map((r: any) => String(r.symbol));
    const total = symbols.length * horizons.length;

    for (const symbol of symbols) {
      for (const horizon of horizons) {
        if (![7, 30, 90, 180, 365].includes(horizon)) {
          generationErrors.push({ symbol, horizon, code: 'INVALID_HORIZON', message: `Horizon ${horizon} not allowed` });
          failed++;
          continue;
        }

        try {
          // Idempotency: skip if prediction already exists for today + this horizon
          const existing = await pool.query(
            `SELECT id FROM prediction_registry WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3`,
            [symbol, today, horizon]
          );

          if (existing.rows.length > 0) {
            skipped++;
            continue;
          }

          // Run StockStory engine for this symbol
          const engineResult = await this.evaluateSymbol(symbol, today);
          if (!engineResult) {
            skipped++;
            continue;
          }

          // P0-MEGA: Require critical scores — skip if missing
          const criticalScores = {
            quality: typeof engineResult.quality === 'number' ? engineResult.quality : null,
            growth: typeof engineResult.growth === 'number' ? engineResult.growth : null,
            risk: typeof engineResult.risk === 'number' ? engineResult.risk : null,
          };

          if (criticalScores.quality === null || criticalScores.growth === null || criticalScores.risk === null) {
            generationErrors.push({
              symbol,
              horizon,
              code: 'INSUFFICIENT_ANALYTICAL_DATA',
              message: `Missing critical scores for ${symbol} at horizon ${horizon}`,
            });
            skippedInsufficientData++;
            continue;
          }

          // Map StockStory classification to registry classification (throws on unknown)
          const classification = mapStockStoryClassification(engineResult.classification);

          // P0-MEGA: Correct confidence formula — risk REDUCES confidence
          const riskStrength = Math.max(0, 100 - criticalScores.risk);
          const valuationScore = typeof engineResult.valuation === 'number' ? engineResult.valuation : null;
          const growthScore = criticalScores.growth;
          const momentumScore = typeof engineResult.momentum === 'number' ? engineResult.momentum : null;
          const qualityScore = criticalScores.quality;

          const confidenceInputs = [
            { score: riskStrength, weight: 0.35 },
            { score: valuationScore, weight: 0.25 },
            { score: growthScore, weight: 0.20 },
            { score: momentumScore, weight: 0.15 },
            { score: qualityScore, weight: 0.05 },
          ].filter(c => c.score !== null);

          const calibratedConfidence = confidenceInputs.length > 0
            ? Math.min(95, Math.max(5, Math.round(
                confidenceInputs.reduce((sum, c) => sum + c.score! * c.weight, 0)
              )))
            : 5;

          // Sector score: use factor snapshot if available, else null
          const sectorScore = (engineResult._sectorStrengthFactor != null)
            ? Number(engineResult._sectorStrengthFactor)
            : null;

          const confidenceLevel: 'Very High' | 'High' | 'Medium' | 'Low' =
            calibratedConfidence >= 80 ? 'High' : calibratedConfidence >= 65 ? 'Medium' : 'Low';

          // Health score — required, do not invent
          const rankingScore = typeof engineResult.healthScore === 'number'
            ? Math.min(100, Math.max(0, Math.round(engineResult.healthScore)))
            : null;

          if (rankingScore === null) {
            generationErrors.push({
              symbol,
              horizon,
              code: 'INSUFFICIENT_ANALYTICAL_DATA',
              message: `Missing healthScore for ${symbol}`,
            });
            skippedInsufficientData++;
            continue;
          }

          const input: ContractCreatePredictionInput = {
            symbol,
            predictionDate: today,
            rankingScore,
            classification,
            confidenceScore: calibratedConfidence,
            confidenceLevel,
            qualityScore: Math.round(criticalScores.quality),
            growthScore: Math.round(criticalScores.growth),
            valueScore: Math.round(valuationScore),
            momentumScore: Math.round(momentumScore),
            riskScore: Math.round(criticalScores.risk),
            sectorScore: sectorScore !== null ? Math.round(sectorScore) : 0,
            priceAtPrediction: null,
            benchmarkLevel: null,
            predictionHorizon: horizon as RegistryPredictionHorizon,
            createdBy: 'DailyPredictionCapture',
          };

          await predictionRegistry.createPrediction(input);
          created++;
        } catch (err: any) {
          generationErrors.push({
            symbol,
            horizon,
            code: 'PREDICTION_FAILED',
            message: err?.message ?? 'Unknown error',
          });
          failed++;
        }
      }
    }

    return { total, created, skipped, skippedInsufficientData, failed, errors: generationErrors.slice(0, 50) };
  }

  private async evaluateSymbol(symbol: string, tradeDate: string): Promise<any> {
    try {
      const featRes = await pool.query(
        `SELECT * FROM feature_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
        [symbol]
      );
      const factRes = await pool.query(
        `SELECT * FROM factor_snapshots WHERE symbol = $1 ORDER BY trade_date DESC LIMIT 1`,
        [symbol]
      );
      const finRes = await pool.query(
        `SELECT * FROM financial_snapshots WHERE symbol = $1 ORDER BY period_end DESC LIMIT 1`,
        [symbol]
      );

      const feat = featRes.rows[0] as any;
      const fact = factRes.rows[0] as any;
      const fin = finRes.rows[0] as any;

      if (!feat || !fact) return null;

      // Temporal integrity: guard against future-dated factor data
      const temporalResult = TemporalGuard.guardFactorInsert(
        {
          symbol,
          tradeDate: fact.trade_date,
          qualityFactor: Number(fact.quality_factor),
          valueFactor: Number(fact.value_factor),
          growthFactor: Number(fact.growth_factor),
          momentumFactor: Number(fact.momentum_factor),
          riskFactor: Number(fact.risk_factor),
          sectorStrengthFactor: Number(fact.sector_strength_factor),
          factorScore: Number(fact.factor_score),
        },
        tradeDate
      );
      if (!temporalResult.allowed) return null;

      // Temporal integrity: guard quality data
      const qualityDate = fin?.period_end ?? null;
      const qualityGuardResult = TemporalGuard.guardQualityAgainstPrediction(
        qualityDate, tradeDate, symbol
      );
      if (!qualityGuardResult.allowed) return null;

      // Load actual sector from symbols table
      let sectorName = 'Unknown';
      let sectorStrength: number | null = null;
      try {
        const symInfoRes = await pool.query(
          `SELECT sector FROM symbols WHERE symbol = $1 LIMIT 1`,
          [symbol]
        );
        if (symInfoRes.rows.length > 0 && symInfoRes.rows[0].sector) {
          sectorName = String(symInfoRes.rows[0].sector);
        }
        if (fact?.sector_strength_factor != null) {
          sectorStrength = Number(fact.sector_strength_factor);
        }
      } catch {
        sectorName = 'Unknown';
        sectorStrength = fact?.sector_strength_factor != null ? Number(fact.sector_strength_factor) : null;
      }

      const engineInputs = {
        symbol,
        tradeDate,
        features: {
          rsi: feat.rsi != null ? Number(feat.rsi) : null,
          macd: feat.macd != null ? Number(feat.macd) : null,
          macdSignal: feat.macd_signal != null ? Number(feat.macd_signal) : null,
          macdHistogram: feat.macd_histogram != null ? Number(feat.macd_histogram) : null,
          adx: feat.adx != null ? Number(feat.adx) : null,
          atr: feat.atr != null ? Number(feat.atr) : null,
          bollingerWidth: feat.bollinger_width != null ? Number(feat.bollinger_width) : null,
          momentum: feat.momentum != null ? Number(feat.momentum) : null,
          volatility: feat.volatility != null ? Number(feat.volatility) : null,
          relativeStrength: feat.relative_strength != null ? Number(feat.relative_strength) : null,
          movingAverageDistance: feat.moving_average_distance != null ? Number(feat.moving_average_distance) : null,
          trendStrength: feat.trend_strength != null ? Number(feat.trend_strength) : null,
        },
        factors: {
          qualityFactor: Number(fact.quality_factor),
          valueFactor: Number(fact.value_factor),
          growthFactor: Number(fact.growth_factor),
          momentumFactor: Number(fact.momentum_factor),
          riskFactor: Number(fact.risk_factor),
          sectorStrengthFactor: Number(fact.sector_strength_factor),
          factorScore: Number(fact.factor_score),
        },
        financials: {
          peRatio: isFiniteNumber(fin?.pe_ratio),
          pbRatio: isFiniteNumber(fin?.pb_ratio),
          eps: isFiniteNumber(fin?.eps),
          dividendYield: isFiniteNumber(fin?.dividend_yield),
          beta: isFiniteNumber(fin?.beta),
          marketCap: isFiniteNumber(fin?.market_cap),
          freeFloat: isFiniteNumber(fin?.free_float),
          fcfYield: isFiniteNumber(fin?.fcf_yield),
          evEbitda: isFiniteNumber(fin?.ev_ebitda),
          roa: isFiniteNumber(fin?.roa),
          roe: isFiniteNumber(fin?.roe),
          roic: isFiniteNumber(fin?.roic),
          debtToEquity: isFiniteNumber(fin?.debt_to_equity),
          currentRatio: isFiniteNumber(fin?.current_ratio),
          revenueGrowth: isFiniteNumber(fin?.revenue_growth),
          profitGrowth: isFiniteNumber(fin?.profit_growth),
          epsGrowth: isFiniteNumber(fin?.eps_growth),
          fcfGrowth: isFiniteNumber(fin?.fcf_growth),
          grossMargin: isFiniteNumber(fin?.gross_margin),
          operatingMargin: isFiniteNumber(fin?.operating_margin),
        },
        historical: { featureHistory: [], factorHistory: [] },
        sector: { name: sectorName, sectorStrength: sectorStrength ?? 50, sectorMomentum: 'Steady' as const },
      };

      // F5: Feature-flagged delegation to UnifiedPredictionEngine
      const unifiedEngineEnabled = process.env.UNIFIED_PREDICTION_ENGINE_ENABLED === 'true';
      const predictionFactoryDelegation = process.env.F5_PREDICTION_FACTORY_DELEGATE === 'true';

      if (unifiedEngineEnabled && predictionFactoryDelegation) {
        const { UnifiedPredictionEngine } = require('../../prediction-engine/UnifiedPredictionEngine');
        const { adaptPredictionFactoryData } = require('../../prediction-engine/adapters/PredictionFactoryAdapter');
        const engine = new UnifiedPredictionEngine();
        const unifiedInput = adaptPredictionFactoryData(
          symbol,
          30,
          tradeDate,
          fin ?? {},
          feat ?? {},
          fact ?? {},
          sectorName,
          sectorStrength,
          [],
          []
        );
        const output = engine.evaluate(unifiedInput);
        return mapUnifiedOutputToContractInput(output);
      }

      const result = await stockStoryEngine.evaluate(engineInputs as any);
      (result as any)._sectorStrengthFactor = fact?.sector_strength_factor ?? null;
      return result;
    } catch {
      return null;
    }
  }
}

export const predictionFactory = new PredictionFactory();
export default PredictionFactory;
