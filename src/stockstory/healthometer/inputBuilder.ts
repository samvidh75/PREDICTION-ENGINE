import { query } from '../../db/index';
import type { HealthometerInput } from './types';

function parseFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function buildHealthometerInput(symbol: string): Promise<HealthometerInput | null> {
  const sym = symbol.toUpperCase().trim();

  const [fsRes, factorRes, featureRes, prRes] = await Promise.all([
    query(
      `SELECT pe_ratio, pb_ratio, ev_ebitda, roe, roce, roa,
              debt_to_equity, current_ratio, operating_margin,
              net_margin, gross_margin, revenue_growth, profit_growth,
              eps_growth, fcf_yield, market_cap, beta
       FROM financial_snapshots
       WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         AND pe_ratio IS NOT NULL
       ORDER BY snapshot_date DESC LIMIT 1`,
      [sym]
    ),
    query(
      `SELECT quality_factor, value_factor, growth_factor,
              momentum_factor, risk_factor, sector_strength_factor
       FROM factor_snapshots
       WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
       ORDER BY trade_date DESC LIMIT 1`,
      [sym]
    ),
    query(
      `SELECT volatility, momentum, rsi, trend_strength
       FROM feature_snapshots
       WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
       ORDER BY trade_date DESC LIMIT 1`,
      [sym]
    ),
    query(
      `SELECT ranking_score, classification, confidence_score, confidence_level
       FROM prediction_registry
       WHERE UPPER(REPLACE(symbol, ' ', '')) = $1
         AND ranking_score IS NOT NULL
       ORDER BY prediction_date DESC LIMIT 1`,
      [sym]
    ),
  ]);

  const fsRow = (fsRes.rows?.[0] || null) as Record<string, unknown> | null;
  const factorRow = (factorRes.rows?.[0] || null) as Record<string, unknown> | null;
  const featureRow = (featureRes.rows?.[0] || null) as Record<string, unknown> | null;
  const prRow = (prRes.rows?.[0] || null) as Record<string, unknown> | null;

  if (!fsRow && !factorRow && !featureRow && !prRow) {
    return null;
  }

  return {
    symbol: sym,
    financials: {
      peRatio: parseFinite(fsRow?.pe_ratio),
      pbRatio: parseFinite(fsRow?.pb_ratio),
      evEbitda: parseFinite(fsRow?.ev_ebitda),
      roe: parseFinite(fsRow?.roe),
      roce: parseFinite(fsRow?.roce),
      roa: parseFinite(fsRow?.roa),
      debtToEquity: parseFinite(fsRow?.debt_to_equity),
      currentRatio: parseFinite(fsRow?.current_ratio),
      operatingMargin: parseFinite(fsRow?.operating_margin),
      netMargin: parseFinite(fsRow?.net_margin),
      grossMargin: parseFinite(fsRow?.gross_margin),
      revenueGrowth: parseFinite(fsRow?.revenue_growth),
      profitGrowth: parseFinite(fsRow?.profit_growth),
      epsGrowth: parseFinite(fsRow?.eps_growth),
      fcfYield: parseFinite(fsRow?.fcf_yield),
      marketCap: parseFinite(fsRow?.market_cap),
      beta: parseFinite(fsRow?.beta),
    },
    factors: {
      qualityFactor: parseFinite(factorRow?.quality_factor),
      valueFactor: parseFinite(factorRow?.value_factor),
      growthFactor: parseFinite(factorRow?.growth_factor),
      momentumFactor: parseFinite(factorRow?.momentum_factor),
      riskFactor: parseFinite(factorRow?.risk_factor),
      sectorStrengthFactor: parseFinite(factorRow?.sector_strength_factor),
    },
    features: {
      volatility: parseFinite(featureRow?.volatility),
      momentum: parseFinite(featureRow?.momentum),
      rsi: parseFinite(featureRow?.rsi),
      trendStrength: parseFinite(featureRow?.trend_strength),
    },
    predictionRegistry: {
      rankingScore: parseFinite(prRow?.ranking_score),
      classification: prRow?.classification ? String(prRow.classification) : null,
      confidenceScore: parseFinite(prRow?.confidence_score),
      confidenceLevel: prRow?.confidence_level ? String(prRow.confidence_level) : null,
    },
  };
}
