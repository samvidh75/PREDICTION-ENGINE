import {
  UnifiedPredictionInput,
  UnifiedPredictionOutput,
  UnifiedEngineConfig,
  UnifiedClassification,
  UnifiedFactorScore,
  UnifiedFactorGroup,
  UnifiedFeatureValue,
  UnifiedConfidenceLevel,
  UnifiedHorizon,
} from './types';

import { PREDICTION_THRESHOLDS } from '../stockstory/prediction/PredictionThresholds';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function weightedAverage(
  components: Array<{ score: number; weight: number }>
): number | null {
  const totalWeight = components.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return null;
  const avg = components.reduce((sum, c) => sum + c.score * c.weight, 0) / totalWeight;
  return clampScore(avg);
}

function safeFinite(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function classify(s: number | null): UnifiedClassification {
  if (s === null) return 'INSUFFICIENT_DATA';
  if (s >= PREDICTION_THRESHOLDS.EXCELLENT) return 'EXCELLENT';
  if (s >= PREDICTION_THRESHOLDS.HEALTHY) return 'HEALTHY';
  if (s >= PREDICTION_THRESHOLDS.STABLE) return 'STABLE';
  if (s >= PREDICTION_THRESHOLDS.WEAKENING) return 'WEAKENING';
  return 'AT_RISK';
}

function computeDataCompleteness(input: UnifiedPredictionInput): number {
  const fields: Array<number | null | undefined> = [
    input.close, input.open, input.high, input.low, input.volume,
    input.peRatio, input.pbRatio, input.roe, input.roa, input.roic,
    input.dividendYield, input.marketCap, input.beta, input.debtToEquity,
    input.currentRatio, input.revenueGrowth, input.profitGrowth,
    input.epsGrowth, input.fcfGrowth, input.grossMargin, input.operatingMargin,
    input.netMargin, input.fcfYield, input.evEbitda,
  ];
  const present = fields.filter(f => f !== null && f !== undefined).length;
  return clampScore((present / fields.length) * 100);
}

function computeMissingFields(input: UnifiedPredictionInput): string[] {
  const missing: string[] = [];
  if (input.peRatio === null || input.peRatio === undefined) missing.push('peRatio');
  if (input.pbRatio === null || input.pbRatio === undefined) missing.push('pbRatio');
  if (input.roe === null || input.roe === undefined) missing.push('roe');
  if (input.roa === null || input.roa === undefined) missing.push('roa');
  if (input.roic === null || input.roic === undefined) missing.push('roic');
  if (input.dividendYield === null || input.dividendYield === undefined) missing.push('dividendYield');
  if (input.marketCap === null || input.marketCap === undefined) missing.push('marketCap');
  if (input.beta === null || input.beta === undefined) missing.push('beta');
  if (input.debtToEquity === null || input.debtToEquity === undefined) missing.push('debtToEquity');
  if (input.currentRatio === null || input.currentRatio === undefined) missing.push('currentRatio');
  if (input.revenueGrowth === null || input.revenueGrowth === undefined) missing.push('revenueGrowth');
  if (input.profitGrowth === null || input.profitGrowth === undefined) missing.push('profitGrowth');
  if (input.close === null || input.close === undefined) missing.push('close');
  return missing;
}

function buildFactorScore(
  group: UnifiedFactorGroup,
  value: number | null,
  availability: number,
  featureCount: number,
  availableCount: number,
  missing: string[],
  reason: string,
): UnifiedFactorScore {
  const hasData = value !== null;
  const ratio = featureCount > 0 ? availableCount / featureCount : 0;
  const conf = hasData ? clampScore(Math.round(availability * ratio)) : null;
  return {
    group,
    value: hasData ? clampScore(value) : null,
    availability: clampScore(availability),
    confidence: conf,
    featureCount,
    availableFeatureCount: availableCount,
    missingFeatures: missing,
    reason,
  };
}

function computeQualityScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const roe = safeFinite(input.roe);
  const roa = safeFinite(input.roa);
  const roic = safeFinite(input.roic);
  const missing: string[] = [];

  let s = 50;
  let count = 0;

  if (roe !== null) {
    if (roe > 0.20) s += 25; else if (roe > 0.10) s += 15; else if (roe > 0.05) s += 5; else if (roe > 0) s -= 5; else s -= 20;
    count++;
  } else {
    missing.push('roe');
  }

  if (roa !== null) {
    if (roa > 0.10) s += 20; else if (roa > 0.05) s += 10; else if (roa > 0) s += 5; else s -= 15;
    count++;
  } else {
    missing.push('roa');
  }

  if (roic !== null) {
    if (roic > 0.15) s += 20; else if (roic > 0.10) s += 10; else if (roic > 0.05) s += 5; else s -= 10;
    count++;
  } else {
    missing.push('roic');
  }

  return { score: count > 0 ? clampScore(s) : 50, missing };
}

function computeValuationScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const pe = safeFinite(input.peRatio);
  const pb = safeFinite(input.pbRatio);
  const missing: string[] = [];

  let s = 50;
  let count = 0;

  if (pe !== null && pe > 0) {
    if (pe < 10) s += 25; else if (pe < 15) s += 20; else if (pe < 20) s += 10; else if (pe < 30) s += 0; else if (pe < 50) s -= 10; else s -= 20;
    count++;
  } else if (pe !== null && pe < 0) { s -= 15; count++; }
  else { missing.push('peRatio'); }

  if (pb !== null && pb > 0) {
    if (pb < 1) s += 20; else if (pb < 2) s += 15; else if (pb < 4) s += 5; else if (pb < 8) s -= 5; else s -= 15;
    count++;
  } else { missing.push('pbRatio'); }

  return { score: count > 0 ? clampScore(s) : 50, missing };
}

function computeGrowthScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const rev = safeFinite(input.revenueGrowth);
  const eps = safeFinite(input.epsGrowth);
  const missing: string[] = [];

  let s = 50;
  let count = 0;

  if (rev !== null) {
    if (rev > 0.20) s += 25; else if (rev > 0.10) s += 15; else if (rev > 0.05) s += 5; else if (rev > 0) s += 0; else s -= 20;
    count++;
  } else { missing.push('revenueGrowth'); }

  if (eps !== null) {
    if (eps > 0.20) s += 25; else if (eps > 0.10) s += 15; else if (eps > 0.05) s += 5; else if (eps > 0) s += 0; else s -= 20;
    count++;
  } else { missing.push('epsGrowth'); }

  return { score: count > 0 ? clampScore(s) : 50, missing };
}

function computeStabilityScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const mc = safeFinite(input.marketCap);
  const cr = safeFinite(input.currentRatio);
  const missing: string[] = [];

  let s = 50;
  let count = 0;

  if (mc !== null) {
    if (mc > 1e12) s += 25; else if (mc > 1e11) s += 20; else if (mc > 1e10) s += 15; else if (mc > 1e9) s += 10; else if (mc > 1e8) s += 5;
    s = clampScore(s);
    count++;
  } else { missing.push('marketCap'); }

  if (cr !== null) {
    if (cr > 3) s += 15; else if (cr > 2) s += 10; else if (cr > 1.5) s += 5; else if (cr > 1) s += 0; else s -= 10;
    count++;
  } else { missing.push('currentRatio'); }

  return { score: count > 0 ? clampScore(s) : 50, missing };
}

function computeMomentumScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const prices = input.closePrices ?? [];
  if (prices.length < 2) return { score: 50, missing: ['closePrices'] };

  const first = prices[0];
  const last = prices[prices.length - 1];
  if (first <= 0) return { score: 50, missing: [] };

  const change = (last - first) / first;
  let score = 50;
  if (change > 0.10) score = 80;
  else if (change > 0.05) score = 70;
  else if (change > 0.02) score = 60;
  else if (change > -0.02) score = 50;
  else if (change > -0.05) score = 40;
  else if (change > -0.10) score = 30;
  else score = 20;
  return { score, missing: [] };
}

function computeRiskScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const beta = safeFinite(input.beta);
  const dte = safeFinite(input.debtToEquity);
  const missing: string[] = [];

  let s = 30;
  let count = 0;

  if (beta !== null) {
    if (beta > 1.5) s += 30; else if (beta > 1.2) s += 20; else if (beta > 0.8) s += 10; else if (beta > 0.5) s += 5; else s += 0;
    count++;
  } else { missing.push('beta'); }

  if (dte !== null) {
    if (dte > 2) s += 30; else if (dte > 1) s += 20; else if (dte > 0.5) s += 10; else if (dte > 0.2) s += 5; else s += 0;
    count++;
  } else { missing.push('debtToEquity'); }

  return { score: count > 0 ? clampScore(s) : 30, missing };
}

function computeSectorScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  if (!input.sector) return { score: 50, missing: ['sector'] };
  const sf = safeFinite(input.sectorStrengthFactor);
  if (sf !== null) return { score: clampScore(sf), missing: [] };
  return { score: 50, missing: ['sector'] };
}

function computeLiquidityScore(input: UnifiedPredictionInput): { score: number; missing: string[] } {
  const cr = safeFinite(input.currentRatio);
  if (cr === null) return { score: 50, missing: ['currentRatio'] };
  if (cr > 3) return { score: 80, missing: [] };
  if (cr > 2) return { score: 70, missing: [] };
  if (cr > 1.5) return { score: 60, missing: [] };
  if (cr > 1) return { score: 50, missing: [] };
  if (cr > 0.5) return { score: 30, missing: [] };
  return { score: 20, missing: [] };
}

function computeDividendHealthScore(input: UnifiedPredictionInput, qualityScore: number): { score: number; missing: string[] } {
  const dy = safeFinite(input.dividendYield);
  if (dy === null) return { score: 50, missing: ['dividendYield'] };
  let s = 50;
  if (dy > 0.15) s = qualityScore < 50 ? 10 : 30;
  else if (dy > 0.10) s = qualityScore < 50 ? 25 : 50;
  else if (dy >= 0.05 && dy <= 0.07) s = 90;
  else if (dy > 0.04) s = 80;
  else if (dy > 0.02) s = 60;
  else if (dy > 0) s = 35;
  else s = 20;
  return { score: clampScore(s), missing: [] };
}

function buildFeatureValues(input: UnifiedPredictionInput): UnifiedFeatureValue[] {
  const features: UnifiedFeatureValue[] = [];
  const pairs: Array<[string, string, number | null | undefined]> = [
    ['close', 'Close Price', input.close],
    ['open', 'Open Price', input.open],
    ['high', 'High Price', input.high],
    ['low', 'Low Price', input.low],
    ['volume', 'Volume', input.volume],
    ['peRatio', 'P/E Ratio', input.peRatio],
    ['pbRatio', 'P/B Ratio', input.pbRatio],
    ['roe', 'ROE', input.roe],
    ['roa', 'ROA', input.roa],
    ['roic', 'ROIC', input.roic],
    ['dividendYield', 'Dividend Yield', input.dividendYield],
    ['marketCap', 'Market Cap', input.marketCap],
    ['beta', 'Beta', input.beta],
    ['debtToEquity', 'Debt/Equity', input.debtToEquity],
    ['currentRatio', 'Current Ratio', input.currentRatio],
    ['revenueGrowth', 'Revenue Growth', input.revenueGrowth],
    ['epsGrowth', 'EPS Growth', input.epsGrowth],
    ['fcfYield', 'FCF Yield', input.fcfYield],
    ['evEbitda', 'EV/EBITDA', input.evEbitda],
    ['grossMargin', 'Gross Margin', input.grossMargin],
    ['operatingMargin', 'Operating Margin', input.operatingMargin],
    ['netMargin', 'Net Margin', input.netMargin],
    ['rsi', 'RSI', input.rsi],
    ['macd', 'MACD', input.macd],
    ['adx', 'ADX', input.adx],
    ['atr', 'ATR', input.atr],
    ['bollingerWidth', 'Bollinger Width', input.bollingerWidth],
    ['relativeStrength', 'Relative Strength', input.relativeStrength],
    ['movingAverageDistance', 'MA Distance', input.movingAverageDistance],
    ['trendStrength', 'Trend Strength', input.trendStrength],
  ];
  for (const [id, label, raw] of pairs) {
    features.push({
      id,
      label,
      raw: safeFinite(raw),
      transformed: safeFinite(raw),
      unit: '',
      sourceTable: '',
      sourceField: id,
      freshness: null,
      confidence: null,
      isStale: false,
    });
  }
  return features;
}

function assessFreshness(input: UnifiedPredictionInput): UnifiedConfidenceLevel {
  const staleFields = input.staleFieldCount ?? 0;
  if (staleFields >= 5) return 'CRITICAL';
  if (staleFields >= 3) return 'LOW';
  if (staleFields >= 1) return 'MEDIUM';
  return 'HIGH';
}

function computeConfidenceScore(input: UnifiedPredictionInput): number {
  const base = input.fieldCompleteness ?? computeDataCompleteness(input);
  const stale = input.staleFieldCount ?? 0;
  const stalePenalty = stale * 8;
  const hasPrice = input.close !== null && input.close !== undefined ? 0 : 20;
  const partialCount = input.partialFactorCount ?? 0;
  const coverageBonus = partialCount <= 1 ? 10 : partialCount <= 3 ? 5 : 0;
  return clampScore(base - stalePenalty - hasPrice + coverageBonus);
}

function defaultConfig(): UnifiedEngineConfig {
  return {
    mode: 'active',
    modelVersion: '1.0.0',
    enabledHorizons: [7, 30, 90, 180, 365],
    maxSymbolsPerRun: 100,
    shadowDriftThreshold: 15,
    requireConfirmation: false,
    confirmationEnvVar: 'UNIFIED_ENGINE_CONFIRMED',
  };
}

export class UnifiedPredictionEngine {
  private config: UnifiedEngineConfig;

  constructor(config?: Partial<UnifiedEngineConfig>) {
    this.config = { ...defaultConfig(), ...config };
  }

  evaluate(input: UnifiedPredictionInput): UnifiedPredictionOutput {
    const safe: UnifiedPredictionInput = {
      ...input,
      close: safeFinite(input.close),
      open: safeFinite(input.open),
      high: safeFinite(input.high),
      low: safeFinite(input.low),
      peRatio: safeFinite(input.peRatio),
      pbRatio: safeFinite(input.pbRatio),
      roe: safeFinite(input.roe),
      roa: safeFinite(input.roa),
      roic: safeFinite(input.roic),
      dividendYield: safeFinite(input.dividendYield),
      marketCap: safeFinite(input.marketCap),
      beta: safeFinite(input.beta),
      debtToEquity: safeFinite(input.debtToEquity),
      currentRatio: safeFinite(input.currentRatio),
      revenueGrowth: safeFinite(input.revenueGrowth),
      profitGrowth: safeFinite(input.profitGrowth),
      epsGrowth: safeFinite(input.epsGrowth),
      fcfYield: safeFinite(input.fcfYield),
      evEbitda: safeFinite(input.evEbitda),
      grossMargin: safeFinite(input.grossMargin),
      operatingMargin: safeFinite(input.operatingMargin),
      netMargin: safeFinite(input.netMargin),
    };

    const quality = computeQualityScore(safe);
    const valuation = computeValuationScore(safe);
    const growth = computeGrowthScore(safe);
    const stability = computeStabilityScore(safe);
    const momentum = computeMomentumScore(safe);
    const risk = computeRiskScore(safe);
    const sector = computeSectorScore(safe);
    const liquidity = computeLiquidityScore(safe);
    const dividendHealth = computeDividendHealthScore(safe, quality.score);

    const missingPrice = safe.close === null && safe.closePrices.length === 0;

    const factorScores: UnifiedFactorScore[] = [
      buildFactorScore('quality', quality.score, quality.missing.length === 0 ? 100 : 50, 3, 3 - quality.missing.length, quality.missing, 'Profitability ratios'),
      buildFactorScore('valuation', valuation.score, valuation.missing.length === 0 ? 100 : 50, 2, 2 - valuation.missing.length, valuation.missing, 'Price multiples'),
      buildFactorScore('growth', growth.score, growth.missing.length === 0 ? 100 : 50, 2, 2 - growth.missing.length, growth.missing, 'Growth rates'),
      buildFactorScore('stability', stability.score, stability.missing.length === 0 ? 100 : 50, 2, 2 - stability.missing.length, stability.missing, 'Stability metrics'),
      buildFactorScore('momentum', momentum.score, momentum.missing.length === 0 ? 100 : 50, 1, 1, momentum.missing, 'Price momentum'),
      buildFactorScore('risk', risk.score, risk.missing.length === 0 ? 100 : 50, 2, 2 - risk.missing.length, risk.missing, 'Risk indicators'),
      buildFactorScore('sector', sector.score, sector.missing.length === 0 ? 100 : 50, 1, sector.missing.length === 0 ? 1 : 0, sector.missing, 'Sector context'),
      buildFactorScore('liquidity', liquidity.score, liquidity.missing.length === 0 ? 100 : 50, 1, liquidity.missing.length === 0 ? 1 : 0, liquidity.missing, 'Liquidity metrics'),
    ];

    const allMissing = [
      ...quality.missing, ...valuation.missing, ...growth.missing,
      ...stability.missing, ...momentum.missing, ...risk.missing,
      ...sector.missing, ...liquidity.missing, ...dividendHealth.missing,
    ];
    const dedupedMissing = [...new Set(allMissing)];

    const dataCompleteness = computeDataCompleteness(safe);
    const featureVector = buildFeatureValues(safe);
    const confidenceLevel = assessFreshness(safe);
    const confidenceScore = computeConfidenceScore(safe);

    let rankingScore: number | null;
    let classification: UnifiedClassification;

    if (missingPrice) {
      rankingScore = null;
      classification = 'INSUFFICIENT_DATA';
    } else {
      const baseScore = weightedAverage([
        { score: quality.score, weight: 3 },
        { score: growth.score, weight: 2 },
        { score: valuation.score, weight: 2 },
        { score: momentum.score, weight: 1.5 },
        { score: stability.score, weight: 1.5 },
        { score: sector.score, weight: 1 },
        { score: liquidity.score, weight: 1 },
        { score: dividendHealth.score, weight: 1 },
      ]);

      if (baseScore === null) {
        rankingScore = null;
        classification = 'INSUFFICIENT_DATA';
      } else {
        const riskDampening = Math.max(0, (risk.score - 15) * 0.45);
        rankingScore = clampScore(baseScore - riskDampening);
        classification = classify(rankingScore);
      }
    }

    const explanation = missingPrice
      ? 'Insufficient price data to compute ranking score.'
      : `${classification} score based on ${featureVector.filter(f => f.raw !== null).length} features.`;

    return {
      symbol: safe.symbol,
      horizon: safe.horizon ?? 90,
      tradeDate: safe.tradeDate,
      generatedAt: new Date().toISOString(),
      modelVersion: this.config.modelVersion,
      rankingScore,
      healthScore: rankingScore,
      classification,
      confidenceScore,
      confidenceLevel,
      factorScores,
      featureVector,
      dataCompleteness,
      missingFields: dedupedMissing,
      unavailableFeatures: [],
      explanation,
      keyStrengths: [],
      keyWeaknesses: [],
      keyRisks: [],
      sourceEngine: 'UnifiedPredictionEngine',
      createdBy: 'system',
      availableWeight: featureVector.filter(f => f.raw !== null).length / Math.max(featureVector.length, 1),
      isFabricated: false,
      fabricationReason: null,
    };
  }

  evaluateBatch(inputs: UnifiedPredictionInput[]): UnifiedPredictionOutput[] {
    return inputs.map(input => this.evaluate(input));
  }
}

export const unifiedPredictionEngine = new UnifiedPredictionEngine();
export default unifiedPredictionEngine;
