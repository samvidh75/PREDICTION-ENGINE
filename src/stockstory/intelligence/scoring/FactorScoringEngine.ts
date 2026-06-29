/**
 * FactorScoringEngine — 8-Factor AI scoring system.
 * 
 * Weights per spec:
 *   Quality      40% — ROE, ROCE, debt/equity, promoter holding, accruals
 *   Valuation    25% — P/E vs sector, P/B vs sector, EV/EBITDA, DCF margin
 *   Growth       15% — Revenue CAGR (3y), profit CAGR (3y), EBITDA growth
 *   Momentum     10% — 1m/3m/6m returns, RSI, volume trend
 *   Stability     5% — Beta, earnings surprise, volatility
 *   Technical      3% — SMA crossover, MACD, support/resistance
 *   Sentiment      1% — News tone, analyst consensus, social
 *   Catalyst       1% — Earnings soon, dividends, corporate actions
 * 
 * Conviction levels:
 *   85-100 → VERY-HEALTHY
 *   70-84  → HEALTHY
 *   55-69  → STABLE
 *   40-54  → CAUTION
 *   <40    → WATCH-LIST
 */

export interface FactorScores {
  quality: number;
  valuation: number;
  growth: number;
  momentum: number;
  stability: number;
  technical: number;
  sentiment: number;
  catalyst: number;
}

export interface ScoringInput {
  roe: number;
  roce: number;
  debtToEquity: number;
  promoterHolding: number;
  interestCoverageRatio: number;
  peRatio: number;
  sectorPE: number;
  pbRatio: number;
  sectorPB: number;
  evToEbitda: number;
  sectorEvToEbitda: number;
  revenueCAGR3y: number;
  profitCAGR3y: number;
  ebitdaGrowthYoY: number;
  return1m: number;
  return3m: number;
  return6m: number;
  rsi: number;
  volumeTrend: number;
  beta: number;
  earningsSurprise: number;
  volatility: number;
  smaCrossover: boolean;
  macdBullish: boolean;
  nearSupport: boolean;
  newsSentiment: number;
  analystConsensus: number;
  daysToEarnings: number;
  dividendYield: number;
  hasCorporateAction: boolean;
}

export interface ScoringResult {
  compositeScore: number;
  conviction: ConvictionLevel;
  factorScores: FactorScores;
  factorWeights: FactorWeights;
  bullCase: string;
  bearCase: string;
  topDrivers: string[];
  risks: string[];
}

export type ConvictionLevel = "very-healthy" | "healthy" | "stable" | "caution" | "watch-list";

interface FactorWeights {
  quality: number;
  valuation: number;
  growth: number;
  momentum: number;
  stability: number;
  technical: number;
  sentiment: number;
  catalyst: number;
}

const WEIGHTS: FactorWeights = {
  quality: 0.40,
  valuation: 0.25,
  growth: 0.15,
  momentum: 0.10,
  stability: 0.05,
  technical: 0.03,
  sentiment: 0.01,
  catalyst: 0.01,
};

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function scoreQuality(input: ScoringInput): number {
  let score = 50;
  if (input.roe > 25) score += 15;
  else if (input.roe > 15) score += 10;
  else if (input.roe > 10) score += 5;
  else if (input.roe > 5) score -= 5;
  else score -= 15;

  if (input.roce > 25) score += 10;
  else if (input.roce > 15) score += 7;
  else if (input.roce > 10) score += 3;
  else if (input.roce < 5) score -= 10;

  if (input.debtToEquity < 0.3) score += 10;
  else if (input.debtToEquity < 0.5) score += 7;
  else if (input.debtToEquity < 1.0) score += 3;
  else if (input.debtToEquity > 2.0) score -= 12;
  else if (input.debtToEquity > 1.5) score -= 6;

  if (input.promoterHolding > 60) score += 7;
  else if (input.promoterHolding > 50) score += 5;
  else if (input.promoterHolding > 35) score += 2;
  else score -= 5;

  if (input.interestCoverageRatio > 10) score += 8;
  else if (input.interestCoverageRatio > 5) score += 5;
  else if (input.interestCoverageRatio > 3) score += 2;
  else if (input.interestCoverageRatio < 1.5) score -= 8;

  return clamp(score);
}

function scoreValuation(input: ScoringInput): number {
  let score = 50;
  const peDiscount = input.peRatio > 0 ? ((input.sectorPE - input.peRatio) / input.sectorPE) * 100 : 0;
  if (peDiscount > 30) score += 20;
  else if (peDiscount > 15) score += 12;
  else if (peDiscount > 5) score += 6;
  else if (peDiscount < -20) score -= 15;
  else if (peDiscount < -10) score -= 8;

  const pbDiscount = input.pbRatio > 0 ? ((input.sectorPB - input.pbRatio) / input.sectorPB) * 100 : 0;
  if (pbDiscount > 30) score += 15;
  else if (pbDiscount > 15) score += 10;
  else if (pbDiscount > 5) score += 4;
  else if (pbDiscount < -20) score -= 12;

  const evDiscount = input.evToEbitda > 0 ? ((input.sectorEvToEbitda - input.evToEbitda) / input.sectorEvToEbitda) * 100 : 0;
  if (evDiscount > 25) score += 15;
  else if (evDiscount > 10) score += 8;
  else if (evDiscount > 0) score += 3;
  else if (evDiscount < -20) score -= 10;

  return clamp(score);
}

function scoreGrowth(input: ScoringInput): number {
  let score = 50;
  if (input.revenueCAGR3y > 25) score += 18;
  else if (input.revenueCAGR3y > 15) score += 14;
  else if (input.revenueCAGR3y > 10) score += 10;
  else if (input.revenueCAGR3y > 5) score += 5;
  else if (input.revenueCAGR3y < 0) score -= 12;

  if (input.profitCAGR3y > 25) score += 14;
  else if (input.profitCAGR3y > 15) score += 10;
  else if (input.profitCAGR3y > 10) score += 7;
  else if (input.profitCAGR3y > 5) score += 3;
  else if (input.profitCAGR3y < 0) score -= 10;

  const growthRatio = input.revenueCAGR3y > 0 ? input.profitCAGR3y / input.revenueCAGR3y : 0;
  if (growthRatio >= 0.8 && growthRatio <= 1.2) score += 5;
  if (growthRatio > 2.0) score -= 5;

  if (input.ebitdaGrowthYoY > 20) score += 8;
  else if (input.ebitdaGrowthYoY > 10) score += 5;
  else if (input.ebitdaGrowthYoY > 0) score += 2;
  else score -= 5;

  return clamp(score);
}

function scoreMomentum(input: ScoringInput): number {
  let score = 50;
  if (input.return1m > 10) score += 12;
  else if (input.return1m > 5) score += 8;
  else if (input.return1m > 0) score += 4;
  else if (input.return1m < -5) score -= 10;

  if (input.return3m > 20) score += 10;
  else if (input.return3m > 10) score += 7;
  else if (input.return3m > 0) score += 3;
  else if (input.return3m < -10) score -= 8;

  if (input.return6m > 30) score += 8;
  else if (input.return6m > 15) score += 5;
  else if (input.return6m > 0) score += 2;
  else if (input.return6m < -15) score -= 6;

  if (input.rsi >= 50 && input.rsi <= 65) score += 8;
  else if (input.rsi >= 40 && input.rsi <= 70) score += 5;
  else if (input.rsi > 80) score -= 8;
  else if (input.rsi < 30) score -= 5;

  if (input.volumeTrend > 20) score += 7;
  else if (input.volumeTrend > 5) score += 4;
  else if (input.volumeTrend > 0) score += 2;
  else if (input.volumeTrend < -15) score -= 5;

  return clamp(score);
}

function scoreStability(input: ScoringInput): number {
  let score = 50;
  if (input.beta >= 0.7 && input.beta <= 1.1) score += 15;
  else if (input.beta >= 0.5 && input.beta <= 1.3) score += 8;
  else if (input.beta > 1.5) score -= 12;
  else if (input.beta < 0.3) score -= 5;

  if (input.earningsSurprise > 10) score += 12;
  else if (input.earningsSurprise > 5) score += 8;
  else if (input.earningsSurprise > 0) score += 4;
  else if (input.earningsSurprise < -5) score -= 10;

  if (input.volatility < 20) score += 10;
  else if (input.volatility < 30) score += 6;
  else if (input.volatility < 40) score += 2;
  else score -= 8;

  return clamp(score);
}

function scoreTechnical(input: ScoringInput): number {
  let score = 50;
  if (input.smaCrossover) score += 20;
  else score -= 10;
  if (input.macdBullish) score += 15;
  else score -= 8;
  if (input.nearSupport) score += 15;
  if (!input.smaCrossover && !input.nearSupport) score -= 5;
  return clamp(score);
}

function scoreSentiment(input: ScoringInput): number {
  let score = 50;
  score += input.newsSentiment * 30;
  if (input.analystConsensus >= 4.0) score += 20;
  else if (input.analystConsensus >= 3.5) score += 12;
  else if (input.analystConsensus >= 3.0) score += 5;
  else if (input.analystConsensus <= 2.0) score -= 12;
  else if (input.analystConsensus <= 2.5) score -= 5;
  return clamp(score);
}

function scoreCatalyst(input: ScoringInput): number {
  let score = 50;
  if (input.daysToEarnings <= 7) score += 20;
  else if (input.daysToEarnings <= 14) score += 15;
  else if (input.daysToEarnings <= 30) score += 10;
  else if (input.daysToEarnings <= 60) score += 4;

  if (input.dividendYield > 4) score += 15;
  else if (input.dividendYield > 3) score += 12;
  else if (input.dividendYield > 2) score += 8;
  else if (input.dividendYield > 1) score += 4;

  if (input.hasCorporateAction) score += 15;
  return clamp(score);
}

export function scoreToConvictionLevel(score: number): ConvictionLevel {
  if (score >= 85) return "very-healthy";
  if (score >= 70) return "healthy";
  if (score >= 55) return "stable";
  if (score >= 40) return "caution";
  return "watch-list";
}

function factorLabel(factor: keyof FactorScores): string {
  const labels: Record<keyof FactorScores, string> = {
    quality: "Quality",
    valuation: "Valuation",
    growth: "Growth",
    momentum: "Momentum",
    stability: "Stability",
    technical: "Technical",
    sentiment: "Sentiment",
    catalyst: "Catalyst",
  };
  return labels[factor];
}

function generateBullCase(factors: FactorScores, input: ScoringInput): string {
  const strengths: string[] = [];
  if (factors.quality >= 60) strengths.push(`Strong fundamentals — ROE ${input.roe}%, low debt`);
  if (factors.valuation >= 60) strengths.push(`Attractive valuation — trading at discount to sector`);
  if (factors.growth >= 60) strengths.push(`Consistent growth — ${input.revenueCAGR3y}% revenue CAGR (3Y)`);
  if (factors.momentum >= 60) strengths.push(`Positive momentum — upward price trend with volume support`);
  if (strengths.length === 0) strengths.push("Potential turnaround if catalysts materialize");
  return strengths.join(". ") + ".";
}

function generateBearCase(factors: FactorScores, input: ScoringInput): string {
  const weaknesses: string[] = [];
  if (factors.quality < 45) weaknesses.push("Weak fundamentals — high debt or low returns");
  if (factors.valuation < 45) weaknesses.push("Expensive valuation — trading at premium to sector");
  if (factors.growth < 45) weaknesses.push("Slowing growth — revenue or profit declining");
  if (factors.momentum < 45) weaknesses.push("Weak momentum — downward price pressure");
  if (weaknesses.length === 0) weaknesses.push("No significant risk factors identified at this time");
  return weaknesses.join(". ") + ".";
}

export function computeFactorScore(input: ScoringInput): ScoringResult {
  const factorScores: FactorScores = {
    quality: scoreQuality(input),
    valuation: scoreValuation(input),
    growth: scoreGrowth(input),
    momentum: scoreMomentum(input),
    stability: scoreStability(input),
    technical: scoreTechnical(input),
    sentiment: scoreSentiment(input),
    catalyst: scoreCatalyst(input),
  };

  const compositeScore = Math.round(
    factorScores.quality * WEIGHTS.quality +
    factorScores.valuation * WEIGHTS.valuation +
    factorScores.growth * WEIGHTS.growth +
    factorScores.momentum * WEIGHTS.momentum +
    factorScores.stability * WEIGHTS.stability +
    factorScores.technical * WEIGHTS.technical +
    factorScores.sentiment * WEIGHTS.sentiment +
    factorScores.catalyst * WEIGHTS.catalyst
  );

  const conviction = scoreToConvictionLevel(compositeScore);
  const driverEntries = Object.entries(factorScores) as [keyof FactorScores, number][];

  const topDrivers = driverEntries
    .filter(([, s]) => s >= 65)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([factor, score]) => `${factorLabel(factor)} (${score})`);

  const risks = driverEntries
    .filter(([, s]) => s < 40)
    .sort(([, a], [, b]) => a - b)
    .slice(0, 3)
    .map(([factor, score]) => `${factorLabel(factor)} (${score})`);

  return {
    compositeScore,
    conviction,
    factorScores,
    factorWeights: WEIGHTS,
    bullCase: generateBullCase(factorScores, input),
    bearCase: generateBearCase(factorScores, input),
    topDrivers,
    risks,
  };
}

export function convictionDescription(level: ConvictionLevel): string {
  switch (level) {
    case "very-healthy": return "Algorithmic assessment indicates strong fundamentals, attractive valuation, and positive momentum";
    case "healthy": return "Algorithmic assessment indicates above-average metrics with manageable risk";
    case "stable": return "Algorithmic assessment indicates balanced fundamentals with average risk profile";
    case "caution": return "Algorithmic assessment flags elevated risk or weakening fundamentals";
    case "watch-list": return "Algorithmic assessment indicates significant risk — further research recommended";
  }
}
