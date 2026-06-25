import type {
  EngineFactorScore,
  EngineInput,
  EngineOutput,
  UnifiedClassification,
  UnifiedEngineConfig,
  UnifiedFactorGroup,
  UnifiedFactorScore,
  UnifiedPredictionInput,
  UnifiedPredictionOutput,
} from "./types";

const WEIGHTS = {
  quality: 0.25,
  valuation: 0.2,
  growth: 0.2,
  stability: 0.2,
  momentum: 0.15,
} as const;

const present = (value: number | null): value is number =>
  value !== null && Number.isFinite(value);

function factor(score: number | null, reason: string): EngineFactorScore {
  return { score, reason };
}

function qualityScore(input: EngineInput): EngineFactorScore {
  if (![input.roe, input.roce, input.debtToEquity].some(present)) return factor(null, "no data");
  let score = 0;
  if (present(input.roe)) score += input.roe > 20 ? 35 : input.roe > 15 ? 25 : input.roe > 10 ? 15 : 5;
  if (present(input.roce)) score += input.roce > 20 ? 35 : input.roce > 15 ? 25 : input.roce > 10 ? 15 : 5;
  if (present(input.debtToEquity)) score += input.debtToEquity < 0.3 ? 30 : input.debtToEquity < 0.7 ? 22 : input.debtToEquity < 1.5 ? 12 : 0;
  return factor(Math.min(score, 92), "ROE, ROCE and leverage quality");
}

function valuationScore(input: EngineInput): EngineFactorScore {
  if (!present(input.peRatio) && !present(input.pbRatio)) return factor(null, "no data");
  let score = 0;
  if (present(input.peRatio)) score += input.peRatio < 15 ? 40 : input.peRatio < 20 ? 30 : input.peRatio < 25 ? 20 : input.peRatio < 30 ? 10 : 0;
  if (present(input.pbRatio)) score += input.pbRatio < 2 ? 40 : input.pbRatio < 3 ? 30 : input.pbRatio < 4 ? 20 : input.pbRatio < 5 ? 10 : 0;
  if (present(input.dividendYield)) score += input.dividendYield > 2 ? 20 : input.dividendYield > 1 ? 10 : 0;
  return factor(score, "Earnings, book value and dividend valuation");
}

function growthScore(input: EngineInput): EngineFactorScore {
  if (!present(input.revenueGrowth) && !present(input.profitGrowth)) return factor(null, "no data");
  const points = (value: number | null) =>
    !present(value) ? 0 : value > 20 ? 50 : value > 15 ? 40 : value > 10 ? 30 : value > 5 ? 20 : value > 0 ? 10 : 0;
  return factor(points(input.revenueGrowth) + points(input.profitGrowth), "Revenue and profit growth");
}

function stabilityScore(input: EngineInput): EngineFactorScore {
  if (![input.currentRatio, input.debtToEquity, input.roce].some(present)) return factor(null, "no data");
  let score = 0;
  if (present(input.currentRatio)) score += input.currentRatio > 2 ? 40 : input.currentRatio > 1.5 ? 30 : input.currentRatio > 1 ? 20 : 0;
  if (present(input.debtToEquity)) score += input.debtToEquity < 0.3 ? 40 : input.debtToEquity < 0.5 ? 30 : input.debtToEquity < 1 ? 20 : 0;
  if (present(input.roce) && input.roce > 15) score += 20;
  return factor(score, "Liquidity, leverage and capital efficiency");
}

function momentumScore(input: EngineInput): EngineFactorScore {
  const closes = input.closes.filter((value) => Number.isFinite(value) && value > 0);
  if (closes.length < 5) return factor(null, "no data");
  const sample = closes.slice(-20);
  const sma20 = sample.reduce((sum, value) => sum + value, 0) / sample.length;
  const current = closes[closes.length - 1];
  const pctChange = ((current - closes[0]) / closes[0]) / 0.01;
  let score = current > sma20 ? 50 : 0;
  score += pctChange > 10 ? 30 : pctChange > 5 ? 20 : pctChange > 0 ? 10 : 0;
  if (closes.length >= 20) score += 10;
  if (closes.length >= 30) score += 10;
  return factor(score, "Price trend and recent return");
}

function sma(values: number[], period: number): number | null {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [values[0]];
  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * k + result[index - 1] * (1 - k));
  }
  return result;
}

function rsi(values: number[], period = 14): number | null {
  if (values.length < period + 1) return null;
  let avgGain = 0;
  let avgLoss = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    if (change >= 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;
  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

function macd(values: number[]): { macd: number | null; signal: number | null; hist: number | null } {
  if (values.length < 35) return { macd: null, signal: null, hist: null };
  const ema12 = ema(values, 12);
  const ema26 = ema(values, 26);
  const line = ema26.map((value, index) => ema12[index] - value);
  const signalLine = ema(line, 9);
  const lastMacd = line[line.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return { macd: lastMacd, signal: lastSignal, hist: lastMacd - lastSignal };
}

function computeTechnicals(closesInput: number[]): EngineOutput["technicals"] {
  const closes = closesInput.filter((value) => Number.isFinite(value) && value > 0);
  const current = closes.at(-1) ?? null;
  const rsi14 = rsi(closes);
  const macdValues = macd(closes);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const aboveSma20 = current !== null && sma20 !== null ? current > sma20 : null;
  const aboveSma50 = current !== null && sma50 !== null ? current > sma50 : null;
  const rsiZone = rsi14 === null ? null : rsi14 > 70 ? "overbought" : rsi14 < 30 ? "oversold" : "neutral";
  const overallSignal =
    rsi14 === null || macdValues.hist === null || aboveSma20 === null
      ? null
      : rsi14 > 55 && macdValues.hist > 0 && aboveSma20
        ? "bullish"
        : rsi14 < 45 && macdValues.hist < 0 && !aboveSma20
          ? "bearish"
          : "neutral";
  return {
    rsi14: rsi14 === null ? null : Math.round(rsi14 * 10) / 10,
    macd: macdValues.macd === null ? null : Math.round(macdValues.macd * 100) / 100,
    macdSignal: macdValues.signal === null ? null : Math.round(macdValues.signal * 100) / 100,
    macdHist: macdValues.hist === null ? null : Math.round(macdValues.hist * 100) / 100,
    sma20: sma20 === null ? null : Math.round(sma20 * 100) / 100,
    sma50: sma50 === null ? null : Math.round(sma50 * 100) / 100,
    aboveSma20,
    aboveSma50,
    rsiZone,
    overallSignal,
  };
}

function classificationFor(score: number | null): UnifiedClassification {
  if (score === null) return "INSUFFICIENT_DATA";
  if (score >= 80) return "EXCELLENT";
  if (score >= 65) return "HEALTHY";
  if (score >= 50) return "STABLE";
  if (score >= 35) return "WEAKENING";
  return "AT_RISK";
}

function defaultConfig(): UnifiedEngineConfig {
  return {
    mode: "active",
    modelVersion: "2.0.0",
    enabledHorizons: [7, 30, 90, 180, 365],
    maxSymbolsPerRun: 100,
    shadowDriftThreshold: 15,
    requireConfirmation: false,
    confirmationEnvVar: "UNIFIED_ENGINE_CONFIRMED",
  };
}

export class UnifiedPredictionEngine {
  private readonly config: UnifiedEngineConfig;

  constructor(config?: Partial<UnifiedEngineConfig>) {
    this.config = { ...defaultConfig(), ...config };
  }

  static predict(input: EngineInput): EngineOutput {
    const factorScores = {
      quality: qualityScore(input),
      valuation: valuationScore(input),
      growth: growthScore(input),
      stability: stabilityScore(input),
      momentum: momentumScore(input),
    };
    const entries = Object.entries(factorScores) as Array<[
      keyof typeof WEIGHTS,
      EngineFactorScore,
    ]>;
    const availableWeight = entries.reduce(
      (sum, [name, value]) => sum + (value.score === null ? 0 : WEIGHTS[name]),
      0,
    );
    const weightedTotal = entries.reduce(
      (sum, [name, value]) => sum + (value.score === null ? 0 : value.score * WEIGHTS[name]),
      0,
    );
    const composite = availableWeight === 0 ? null : Math.round(weightedTotal / availableWeight);
    const completenessValues: Array<number | null> = [
      input.peRatio,
      input.pbRatio,
      input.roe,
      input.roce,
      input.debtToEquity,
      input.currentRatio,
      input.revenueGrowth,
      input.profitGrowth,
      input.dividendYield,
      input.closes.length > 0 ? 1 : null,
    ];
    const dataCompleteness = Math.round(
      (completenessValues.filter(present).length / completenessValues.length) / 0.01,
    );
    return {
      composite,
      classification: classificationFor(composite),
      factorScores,
      technicals: computeTechnicals(input.closes),
      dataCompleteness,
      availableWeight,
    };
  }

  predict(input: EngineInput): EngineOutput {
    return UnifiedPredictionEngine.predict(input);
  }

  /** Compatibility adapter for non-UI pipelines. Only the calibrated fields influence scoring. */
  evaluate(input: UnifiedPredictionInput): UnifiedPredictionOutput {
    const prediction = UnifiedPredictionEngine.predict({
      peRatio: input.peRatio,
      pbRatio: input.pbRatio,
      roe: input.roe,
      roce: input.roic,
      debtToEquity: input.debtToEquity,
      currentRatio: input.currentRatio,
      revenueGrowth: input.revenueGrowth,
      profitGrowth: input.profitGrowth,
      dividendYield: input.dividendYield,
      closes: input.closePrices,
    });
    const legacyFactors = Object.entries(prediction.factorScores).map(([group, value]) => ({
      group: group as UnifiedFactorGroup,
      value: value.score,
      availability: value.score === null ? 0 : 100,
      confidence: value.score === null ? null : prediction.dataCompleteness,
      featureCount: 1,
      availableFeatureCount: value.score === null ? 0 : 1,
      missingFeatures: value.score === null ? [group] : [],
      reason: value.reason,
    })) satisfies UnifiedFactorScore[];
    return {
      symbol: input.symbol,
      horizon: input.horizon,
      tradeDate: input.tradeDate,
      generatedAt: new Date().toISOString(),
      modelVersion: this.config.modelVersion,
      rankingScore: prediction.composite,
      healthScore: prediction.composite,
      classification: prediction.classification,
      confidenceScore: prediction.dataCompleteness,
      confidenceLevel: prediction.dataCompleteness >= 75 ? "HIGH" : prediction.dataCompleteness >= 50 ? "MEDIUM" : "LOW",
      factorScores: legacyFactors,
      featureVector: [],
      dataCompleteness: prediction.dataCompleteness,
      missingFields: legacyFactors.flatMap((item) => item.missingFeatures),
      unavailableFeatures: [],
      explanation: prediction.composite === null ? "Insufficient data." : `${prediction.classification} calibrated factor score.`,
      keyStrengths: [],
      keyWeaknesses: [],
      keyRisks: [],
      sourceEngine: "UnifiedPredictionEngine",
      createdBy: "system",
      availableWeight: prediction.availableWeight,
      isFabricated: false,
      fabricationReason: null,
    };
  }

  evaluateBatch(inputs: UnifiedPredictionInput[]): UnifiedPredictionOutput[] {
    return inputs.map((input) => this.evaluate(input));
  }
}

export type { EngineInput, EngineOutput } from "./types";
export const unifiedPredictionEngine = new UnifiedPredictionEngine();
export default unifiedPredictionEngine;
