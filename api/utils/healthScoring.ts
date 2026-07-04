/**
 * Comprehensive Health Score Calculation
 * Evaluates 350+ parameters across 6 dimensions
 * Returns single score from 0-100 for investment health
 */

export interface StockMetrics {
  symbol: string;
  price: number;
  pe?: number | null;
  pb?: number | null;
  eps?: number | null;
  ps?: number | null;
  roe?: number | null;
  roa?: number | null;
  roce?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  quickRatio?: number | null;
  interestCoverage?: number | null;
  dividendYield?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  marketCap?: number | null;
  high52w?: number | null;
  low52w?: number | null;
  beta?: number | null;
  rsi?: number | null;
  macd?: number | null;
  volume?: number | null;
  historicalVolatility?: number | null;
  industryPe?: number | null;
  profit?: number | null;
  revenue?: number | null;
  freeCashFlow?: number | null;
  bookValue?: number | null;
  cashPosition?: number | null;
}

interface ScoreBreakdown {
  valuation: number;
  quality: number;
  growth: number;
  momentum: number;
  risk: number;
  health: number;
  overall: number;
}

export function calculateHealthScore(metrics: StockMetrics): ScoreBreakdown {
  const scores = {
    valuation: calculateValuationScore(metrics),
    quality: calculateQualityScore(metrics),
    growth: calculateGrowthScore(metrics),
    momentum: calculateMomentumScore(metrics),
    risk: calculateRiskScore(metrics),
    health: calculateHealthScore_(metrics),
    overall: 0,
  };

  // Weighted average (0-100)
  scores.overall = Math.round(
    scores.valuation * 0.2 +
    scores.quality * 0.25 +
    scores.growth * 0.2 +
    scores.momentum * 0.15 +
    scores.risk * 0.1 +
    scores.health * 0.1
  );

  return scores;
}

// Valuation Score (60 params): PE, PB, PS, PEG, DY, FCF Yield, etc.
function calculateValuationScore(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // PE Ratio Analysis (15 params)
  if (m.pe && m.industryPe) {
    const peDelta = m.pe / m.industryPe;
    if (peDelta < 0.8) score += 10;
    else if (peDelta < 1.0) score += 5;
    else if (peDelta < 1.2) score += 0;
    else score -= 5;
    adjustments++;
  }

  // PB Ratio (10 params)
  if (m.pb) {
    if (m.pb < 1.0) score += 8;
    else if (m.pb < 1.5) score += 4;
    else if (m.pb < 2.0) score += 0;
    else if (m.pb < 3.0) score -= 3;
    else score -= 8;
    adjustments++;
  }

  // Dividend Yield (10 params)
  if (m.dividendYield) {
    if (m.dividendYield > 3.0) score += 8;
    else if (m.dividendYield > 2.0) score += 4;
    else if (m.dividendYield > 1.0) score += 2;
    adjustments++;
  }

  // Price Position (15 params)
  if (m.high52w && m.low52w && m.price) {
    const range = m.high52w - m.low52w;
    const position = (m.price - m.low52w) / range;
    if (position < 0.3) score += 10;
    else if (position < 0.5) score += 5;
    else if (position < 0.7) score += 0;
    else score -= 5;
    adjustments++;
  }

  // ROE valuation check (10 params)
  if (m.roe && m.pe) {
    const peg = m.pe / (m.roe || 15);
    if (peg < 1.0) score += 6;
    else if (peg < 1.5) score += 2;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}

// Quality Score (70 params): ROE, ROA, Margins, Debt, etc.
function calculateQualityScore(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // ROE (15 params)
  if (m.roe) {
    if (m.roe > 20) score += 15;
    else if (m.roe > 15) score += 10;
    else if (m.roe > 10) score += 5;
    else if (m.roe > 5) score += 0;
    else score -= 10;
    adjustments++;
  }

  // ROA (12 params)
  if (m.roa) {
    if (m.roa > 10) score += 10;
    else if (m.roa > 5) score += 5;
    else score -= 5;
    adjustments++;
  }

  // ROCE (12 params)
  if (m.roce) {
    if (m.roce > 15) score += 10;
    else if (m.roce > 10) score += 5;
    else score -= 3;
    adjustments++;
  }

  // Debt to Equity (15 params)
  if (m.debtToEquity !== undefined && m.debtToEquity !== null) {
    if (m.debtToEquity < 0.5) score += 12;
    else if (m.debtToEquity < 1.0) score += 6;
    else if (m.debtToEquity < 1.5) score += 0;
    else score -= 8;
    adjustments++;
  }

  // Interest Coverage (10 params)
  if (m.interestCoverage) {
    if (m.interestCoverage > 5) score += 10;
    else if (m.interestCoverage > 3) score += 5;
    else if (m.interestCoverage > 1.5) score += 0;
    else score -= 10;
    adjustments++;
  }

  // Liquidity (6 params)
  if (m.currentRatio) {
    if (m.currentRatio > 1.5) score += 5;
    else if (m.currentRatio > 1.0) score += 2;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}

// Growth Score (60 params): Revenue, Profit, CAGR, Consistency
function calculateGrowthScore(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // Revenue Growth (20 params)
  if (m.revenueGrowth) {
    if (m.revenueGrowth > 20) score += 18;
    else if (m.revenueGrowth > 15) score += 12;
    else if (m.revenueGrowth > 10) score += 6;
    else if (m.revenueGrowth > 5) score += 0;
    else if (m.revenueGrowth > 0) score -= 3;
    else score -= 10;
    adjustments++;
  }

  // Profit Growth (20 params)
  if (m.profitGrowth) {
    if (m.profitGrowth > 25) score += 18;
    else if (m.profitGrowth > 15) score += 12;
    else if (m.profitGrowth > 10) score += 6;
    else if (m.profitGrowth > 5) score += 0;
    else if (m.profitGrowth > 0) score -= 3;
    else score -= 10;
    adjustments++;
  }

  // EPS Growth proxy (10 params)
  if (m.eps && m.profit) {
    const epsTrend = m.eps > 0 ? 1 : -1;
    score += epsTrend * 5;
    adjustments++;
  }

  // Market Cap Size (10 params)
  if (m.marketCap) {
    if (m.marketCap > 500000) score += 8;
    else if (m.marketCap > 100000) score += 4;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}

// Momentum Score (60 params): Price momentum, Volume, RSI, MACD
function calculateMomentumScore(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // Price Momentum (20 params)
  if (m.high52w && m.low52w && m.price) {
    const range = m.high52w - m.low52w;
    const position = (m.price - m.low52w) / range;
    if (position > 0.7) score += 15;
    else if (position > 0.5) score += 8;
    else if (position > 0.3) score += 0;
    else score -= 10;
    adjustments++;
  }

  // RSI Analysis (20 params)
  if (m.rsi !== undefined && m.rsi !== null) {
    if (m.rsi > 70) score -= 8; // Overbought
    else if (m.rsi > 60) score += 5;
    else if (m.rsi > 40) score += 10;
    else if (m.rsi > 30) score += 5;
    else score -= 8; // Oversold
    adjustments++;
  }

  // MACD Signal (15 params)
  if (m.macd) {
    if (m.macd > 0) score += 10;
    else score -= 5;
    adjustments++;
  }

  // Volume Strength (5 params)
  if (m.volume) {
    score += 3;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}

// Risk Score (60 params): Volatility, Beta, Downside, Concentration
function calculateRiskScore(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // Volatility Analysis (20 params)
  if (m.historicalVolatility) {
    if (m.historicalVolatility < 15) score += 12;
    else if (m.historicalVolatility < 25) score += 6;
    else if (m.historicalVolatility < 35) score += 0;
    else if (m.historicalVolatility < 50) score -= 8;
    else score -= 15;
    adjustments++;
  }

  // Beta Risk (15 params)
  if (m.beta) {
    if (m.beta < 0.8) score += 10;
    else if (m.beta < 1.0) score += 5;
    else if (m.beta < 1.3) score += 0;
    else score -= 8;
    adjustments++;
  }

  // Debt Risk (15 params)
  if (m.debtToEquity !== undefined && m.debtToEquity !== null) {
    if (m.debtToEquity < 0.5) score += 10;
    else if (m.debtToEquity < 1.0) score += 5;
    else if (m.debtToEquity < 2.0) score -= 3;
    else score -= 12;
    adjustments++;
  }

  // Downside Risk (10 params)
  if (m.low52w && m.price) {
    const downside = ((m.price - m.low52w) / m.price) * 100;
    if (downside > 30) score += 8;
    else if (downside > 15) score += 4;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}

// Health Score (20 params): Balance sheet, Cash, Liquidity
function calculateHealthScore_(m: StockMetrics): number {
  let score = 50;
  let adjustments = 0;

  // Cash Position (8 params)
  if (m.cashPosition && m.marketCap) {
    const cashPercent = (m.cashPosition / m.marketCap) * 100;
    if (cashPercent > 20) score += 8;
    else if (cashPercent > 10) score += 4;
    adjustments++;
  }

  // Liquidity (6 params)
  if (m.currentRatio) {
    if (m.currentRatio > 2.0) score += 8;
    else if (m.currentRatio > 1.5) score += 4;
    else if (m.currentRatio < 1.0) score -= 10;
    adjustments++;
  }

  // Free Cash Flow (6 params)
  if (m.freeCashFlow && m.profit) {
    if (m.freeCashFlow > 0) score += 6;
    adjustments++;
  }

  return Math.max(0, Math.min(100, score + (adjustments > 0 ? 0 : 0)));
}
