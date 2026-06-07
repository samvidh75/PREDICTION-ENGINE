/**
 * TRACK-54 AGENT A — Daily Prediction Generator
 * 
 * Generates 30d/90d/365d predictions for every stock with factor data.
 * Stores immutably in prediction_registry. Idempotent — skips if already generated today.
 */
import pool from '../db/index';
import { stockStoryEngine } from '../stockstory';
import type { CreatePredictionInput } from './types';

export class PredictionFactory {
  private modelVersion = 'SSI-V1';

  async generateDaily(horizons: number[] = [30, 90, 365]): Promise<{
    total: number;
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const today = new Date().toISOString().split('T')[0];
    const errors: string[] = [];
    let created = 0;
    let skipped = 0;

    // Get all symbols with recent factor data
    const symResult = await pool.query(
      `SELECT DISTINCT symbol FROM factor_snapshots WHERE trade_date >= $1`,
      [new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]]
    );

    const symbols = symResult.rows.map(r => r.symbol);

    for (const symbol of symbols) {
      for (const horizon of horizons) {
        try {
          // Check if prediction already exists for today + this horizon
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

          const input: CreatePredictionInput = {
            symbol,
            predictionDate: today,
            rankingScore: engineResult.healthScore,
            classification: engineResult.classification,
            confidenceScore: engineResult.engineDetails.confidence.score,
            confidenceLevel: engineResult.engineDetails.confidence.level,
            qualityScore: engineResult.quality,
            growthScore: engineResult.growth,
            valueScore: engineResult.valuation,
            momentumScore: engineResult.momentum,
            riskScore: engineResult.risk,
            sectorScore: 50,
            priceAtPrediction: 0,
            benchmarkLevel: 0,
            predictionHorizon: horizon,
            createdBy: `PredictionFactory-${this.modelVersion}`,
          };

          const client = await pool.connect();
          try {
            const id = crypto.randomUUID();
            await client.query(
              `INSERT INTO prediction_registry (
                id, symbol, prediction_date, ranking_score, classification,
                confidence_score, confidence_level,
                quality_score, growth_score, value_score, momentum_score, risk_score, sector_score,
                price_at_prediction, benchmark_level, prediction_horizon,
                validation_status, created_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'pending', $17)`,
              [id, symbol, today, input.rankingScore, input.classification,
               input.confidenceScore, input.confidenceLevel,
               input.qualityScore, input.growthScore, input.valueScore,
               input.momentumScore, input.riskScore, input.sectorScore,
               input.priceAtPrediction, input.benchmarkLevel, horizon,
               input.createdBy]
            );
            created++;
          } finally {
            client.release();
          }
        } catch (err: any) {
          errors.push(`${symbol}:${horizon} — ${err.message}`);
        }
      }
    }

    return { total: symbols.length * horizons.length, created, skipped, errors: errors.slice(0, 20) };
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

      const feat = featRes.rows[0];
      const fact = factRes.rows[0];
      const fin = finRes.rows[0];

      if (!feat || !fact) return null;

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
        sector: { name: 'Technology', sectorStrength: 50, sectorMomentum: 'Steady' as const },
      };

      return stockStoryEngine.evaluate(engineInputs as any);
    } catch {
      return null;
    }
  }
}

export const predictionFactory = new PredictionFactory();
export default PredictionFactory;
