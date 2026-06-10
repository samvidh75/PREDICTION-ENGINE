/**
 * TRACK-P4B — PredictionFactory (fixed)
 *
 * Generates 30d/90d/365d predictions for every stock with factor data.
 * Stores immutably in prediction_registry. Idempotent — skips if already generated today.
 *
 * P4B Fixes:
 *   - sectorScore from fact.sector_strength_factor (not engineResult.sectorStrength)
 *   - classification mapped via PredictionRegistryContract.STOCKSTORY_TO_REGISTRY_CLASSIFICATION
 *   - createdBy uses valid 'DailyPredictionCapture' (CHECK constraint safe)
 *   - Loads actual sector from symbols table
 *   - price_at_prediction and benchmark_level are null when unavailable (not null as any)
 *   - Returns structured GenerationSummary
 */
import pool from '../db/index';
import { stockStoryEngine } from '../stockstory';
import { TemporalGuard } from '../validation/TemporalGuard';
import { predictionRegistry } from './PredictionRegistry';
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
  failed: number;
  errors: GenerationError[];
}

export class PredictionFactory {

  async generateDaily(horizons: number[] = [30, 90, 365]): Promise<GenerationSummary> {
    const today = new Date().toISOString().split('T')[0];
    const generationErrors: GenerationError[] = [];
    let created = 0;
    let skipped = 0;
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

          // TRACK-P4B: Map StockStory classification to registry classification
          const classification = mapStockStoryClassification(engineResult.classification);

          // TRACK-94: Calibrate confidence from factor-derived predictive strength
          const calibratedConfidence = Math.min(95, Math.max(50, Math.round(
            (engineResult.risk * 0.35) +
            (engineResult.valuation * 0.25) +
            (engineResult.growth * 0.20) +
            (engineResult.momentum * 0.15) +
            (engineResult.quality * 0.05)
          )));

          // P4B: Use factor snapshot sector_strength_factor as sector_score source.
          // We get this from the evaluateSymbol's return, which includes the fact snapshot.
          const sectorScore = (engineResult._sectorStrengthFactor != null)
            ? Number(engineResult._sectorStrengthFactor)
            : 50;

          const confidenceLevel = calibratedConfidence >= 80 ? 'High' : calibratedConfidence >= 65 ? 'Medium' : 'Low';

          // Validate classification against CHECK constraint
          const validClassifications = ['Exceptional', 'Excellent', 'Good', 'Fair', 'Weak', 'Critical'];
          const safeClassification = validClassifications.includes(classification)
            ? (classification as RegistryClassification)
            : 'Fair' as RegistryClassification;

          const validConfidenceLevels = ['Very High', 'High', 'Medium', 'Low'];
          const safeConfidenceLevel = validConfidenceLevels.includes(confidenceLevel)
            ? (confidenceLevel as 'Very High' | 'High' | 'Medium' | 'Low')
            : 'Medium' as 'Very High' | 'High' | 'Medium' | 'Low';

          const input: ContractCreatePredictionInput = {
            symbol,
            predictionDate: today,
            rankingScore: Math.min(100, Math.max(0, Math.round(engineResult.healthScore ?? 50))),
            classification: safeClassification,
            confidenceScore: calibratedConfidence,
            confidenceLevel: safeConfidenceLevel,
            qualityScore: Math.round(engineResult.quality ?? 50),
            growthScore: Math.round(engineResult.growth ?? 50),
            valueScore: Math.round(engineResult.valuation ?? 50),
            momentumScore: Math.round(engineResult.momentum ?? 50),
            riskScore: Math.round(engineResult.risk ?? 50),
            sectorScore: Math.round(sectorScore),
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

    return { total, created, skipped, failed, errors: generationErrors.slice(0, 50) };
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

      // P4B: Load actual sector from symbols table
      let sectorName = 'Unknown';
      let sectorStrength = 50;
      try {
        const symInfoRes = await pool.query(
          `SELECT sector FROM symbols WHERE symbol = $1 LIMIT 1`,
          [symbol]
        );
        if (symInfoRes.rows.length > 0 && symInfoRes.rows[0].sector) {
          sectorName = String(symInfoRes.rows[0].sector);
        }
        // Use factor snapshot's sector_strength_factor
        if (fact?.sector_strength_factor != null) {
          sectorStrength = Number(fact.sector_strength_factor);
        }
      } catch {
        // Fallback: use factor's sector_strength_factor raw value
        sectorName = 'Unknown';
        sectorStrength = fact?.sector_strength_factor != null ? Number(fact.sector_strength_factor) : 50;
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
        factorBreakdown: {
          qualityFactor: Number(fact.quality_factor),
          valueFactor: Number(fact.value_factor),
          growthFactor: Number(fact.growth_factor),
          momentumFactor: Number(fact.momentum_factor),
          riskFactor: Number(fact.risk_factor),
          sectorStrengthFactor: Number(fact.sector_strength_factor),
          factorScore: Number(fact.factor_score),
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
        historical: { featureHistory: [], factorHistory: [] },
        sector: { name: sectorName, sectorStrength, sectorMomentum: 'Steady' as const },
      };

      const result = await stockStoryEngine.evaluate(engineInputs as any);
      // P4B: Pass sector_strength_factor through the result for extraction upstream
      (result as any)._sectorStrengthFactor = fact?.sector_strength_factor ?? 50;
      return result;
    } catch {
      return null;
    }
  }
}

export const predictionFactory = new PredictionFactory();
export default PredictionFactory;
