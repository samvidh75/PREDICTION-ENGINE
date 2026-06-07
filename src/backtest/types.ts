/**
 * TRACK-31 — Institutional Backtesting, Benchmarking & Alpha Validation
 * 
 * Shared types for all backtesting engines.
 */

// ─── Snapshot Inventory ─────────────────────────────────────────

export interface SnapshotInventoryEntry {
  period: string;           // e.g. "Now", "1M Ago", "3M Ago", "6M Ago", "12M Ago", "24M Ago"
  snapshotDate: string;     // ISO date
  symbols: number;
  factorsAvailable: string[];
  missingPeriods: string[];
  isStale: boolean;
  forwardReturnsAvailable: boolean;
}

export interface SnapshotInventory {
  generatedAt: string;
  firstSnapshotDate: string;
  lastSnapshotDate: string;
  totalSnapshots: number;
  symbolsCovered: number;
  factorsAvailable: string[];
  entries: SnapshotInventoryEntry[];
  missingPeriods: string[];
  stalePeriods: string[];
}

// ─── Benchmark ──────────────────────────────────────────────────

export type BenchmarkIndex = 'NIFTY50' | 'NIFTY100' | 'NIFTY500' | 'EQUAL_WEIGHT_UNIVERSE';

export interface BenchmarkMetrics {
  cagr: number;            // Compound Annual Growth Rate (%)
  sharpe: number;          // Sharpe Ratio (risk-free = 6.5% for India)
  sortino: number;         // Sortino Ratio
  maxDrawdown: number;      // Maximum Drawdown (%)
  volatility: number;       // Annualized Volatility (%)
  totalReturn: number;      // Total Return over period (%)
  positiveMonths: number;
  totalMonths: number;
  winRate: number;          // % of months with positive return
}

export interface BenchmarkResult {
  index: BenchmarkIndex;
  metrics: BenchmarkMetrics;
  periodStart: string;
  periodEnd: string;
  constituents: number;
}

// ─── Portfolio Simulation ──────────────────────────────────────

export type StrategyType = 'TOP_10' | 'TOP_20' | 'TOP_50' | 'SECTOR_BALANCED_TOP_20' | 'CONFIDENCE_WEIGHTED';
export type RebalanceFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface StrategyResult {
  strategy: StrategyType;
  rebalance: RebalanceFrequency;
  metrics: BenchmarkMetrics;
  alpha: number;            // Excess return vs NIFTY500 (%)
  trackingError: number;
  informationRatio: number;
  turnover: number;         // Average portfolio turnover per rebalance
  hitRate: number;          // % of periods beating benchmark
}

// ─── Rolling Backtest ──────────────────────────────────────────

export type WindowSize = 30 | 90 | 180 | 365;

export interface RollingWindowResult {
  windowSize: WindowSize;
  periodStart: string;
  periodEnd: string;
  metrics: BenchmarkMetrics;
  alpha: number;
  trackingError: number;
  informationRatio: number;
  consistency: number;      // % of sub-periods with positive alpha
}

export interface RollingBacktestYearResult {
  year: number;
  windows: RollingWindowResult[];
  averageAlpha: number;
  averageSharpe: number;
  bestWindow: WindowSize;
  worstWindow: WindowSize;
}

// ─── Factor Attribution ────────────────────────────────────────

export interface FactorContribution {
  factor: string;           // quality, growth, value, momentum, risk, sectorStrength
  contribution: number;     // % contribution to total return
  correlation: number;      // Correlation with forward returns
  tStatistic: number;       // Statistical significance
  pValue: number;
  isSignificant: boolean;   // p < 0.05
  bestHorizon: number;      // Best performing lookahead in days
  worstHorizon: number;     // Worst performing lookahead
}

export interface FactorAttributionResult {
  generatedAt: string;
  snapshotsAnalyzed: number;
  factors: FactorContribution[];
  primaryDriver: string;
  secondaryDriver: string;
  weakestFactor: string;
}

// ─── Confidence Validation ─────────────────────────────────────

export type ConfidenceLevel = 'Very High' | 'High' | 'Medium' | 'Low';

export interface ConfidenceBucketResult {
  level: ConfidenceLevel;
  samples: number;
  averageReturn: number;
  hitRate: number;          // % positive returns
  volatility: number;
  maxDrawdown: number;
  averageHealthScore: number;
  sharpeRatio: number;
}

export interface ConfidenceValidationResult {
  generatedAt: string;
  buckets: ConfidenceBucketResult[];
  doesConfidencePredict: boolean;
  statisticalSignificance: number;  // p-value of ANOVA/rank test
  commentary: string;
}

// ─── Sector Bias ───────────────────────────────────────────────

export interface SectorBiasEntry {
  sector: string;
  representation: number;    // % of top-ranked stocks
  universeWeight: number;    // % of total universe
  biasRatio: number;         // representation / universeWeight (> 1 = overweight)
  averageReturn: number;
  returnContribution: number;
}

export interface SectorBiasAuditResult {
  generatedAt: string;
  sectors: SectorBiasEntry[];
  maxBiasRatio: number;
  maxBiasSector: string;
  isDiverse: boolean;        // No single sector > 25% representation
}

// ─── Survivorship Bias ─────────────────────────────────────────

export interface SurvivorshipEntry {
  symbol: string;
  name: string;
  status: 'DELISTED' | 'MERGED' | 'SYMBOL_CHANGED' | 'BANKRUPT' | 'ACTIVE';
  lastTradeDate: string | null;
  impactNote: string;
}

export interface SurvivorshipBiasResult {
  generatedAt: string;
  universeSize: number;
  activeCount: number;
  delistedCount: number;
  mergedCount: number;
  symbolChangeCount: number;
  bankruptCount: number;
  entries: SurvivorshipEntry[];
  isInflated: boolean;       // Whether survivorship materially inflates results
  inflationEstimate: number; // Estimated % overstatement
}

// ─── Alpha Calculation ─────────────────────────────────────────

export interface AlphaResult {
  benchmark: 'NIFTY50' | 'NIFTY500';
  excessReturn: number;      // Annualized excess return (%)
  alpha: number;             // Jensen's Alpha
  beta: number;              // Market sensitivity
  informationRatio: number;
  trackingError: number;
  upCapture: number;         // % of benchmark gains captured
  downCapture: number;       // % of benchmark losses captured (< 100 = protection)
  rSquared: number;
  tStatistic: number;
  pValue: number;
  isSignificant: boolean;
}

// ─── Portfolio Snapshot (for backtest) ─────────────────────────

export interface BacktestStockSnapshot {
  symbol: string;
  name: string;
  sector: string | null;
  healthScore: number;
  classification: string;
  confidence: ConfidenceLevel;
  growth: number;
  quality: number;
  stability: number;
  valuation: number;
  momentum: number;
  risk: number;
  factorScore: number;
  forwardReturn: number;      // Actual realized forward return
}

// ─── Engine Optimisation ───────────────────────────────────────

export interface EngineWeightOptimisation {
  engine: string;             // GrowthEngine, QualityEngine, etc.
  originalWeight: number;
  optimizedWeight: number;
  justification: string;
  improvementInSharpe: number;
  pValue: number;
  isOverfit: boolean;
}

// ─── Institutional Scorecard ───────────────────────────────────

export interface InstitutionalScorecard {
  generatedAt: string;
  categories: {
    alpha: { score: number; weight: number; detail: string };
    sharpe: { score: number; weight: number; detail: string };
    drawdown: { score: number; weight: number; detail: string };
    consistency: { score: number; weight: number; detail: string };
    explainability: { score: number; weight: number; detail: string };
    confidenceAccuracy: { score: number; weight: number; detail: string };
    dataQuality: { score: number; weight: number; detail: string };
  };
  totalScore: number;         // Weighted out of 100
  grade: string;              // A+/A/B/C/D/F
}

// ─── Final Certification ───────────────────────────────────────

export type CertificationLevel =
  | 'Research Prototype'
  | 'Quant Research Platform'
  | 'Internal Investment Tool'
  | 'Institutional Research Tool'
  | 'Production Intelligence Platform'
  | 'INSUFFICIENT EVIDENCE';

export interface FinalAlphaCertification {
  generatedAt: string;
  certificationLevel: CertificationLevel;
  answers: {
    beatsNifty: boolean | null;
    confidenceWorks: boolean | null;
    primaryFactor: string | null;
    alphaStatisticallySignificant: boolean | null;
    survivorshipBiasExists: boolean | null;
    systemInvestable: boolean | null;
  };
  evidenceSummary: string;
  riskWarnings: string[];
  recommendation: string;
}

// ─── Utility ───────────────────────────────────────────────────

export function annualizedReturn(totalReturn: number, days: number): number {
  if (days <= 0 || totalReturn <= -1) return -1;
  return Math.pow(1 + totalReturn, 365 / days) - 1;
}

export function annualizedVolatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252); // Trading days
}

export function sharpeRatio(annualReturn: number, annualVol: number, riskFreeRate = 0.065): number {
  if (annualVol === 0) return 0;
  return (annualReturn - riskFreeRate) / annualVol;
}

export function sortinoRatio(dailyReturns: number[], riskFreeRate = 0.065, tradingDays = 252): number {
  const annualReturn = annualizedReturn(
    dailyReturns.reduce((a, b) => a + b, 0), dailyReturns.length
  );
  const downside = dailyReturns.filter(r => r < 0);
  if (downside.length === 0) return 10; // No downside = excellent
  const downsideMean = downside.reduce((a, b) => a + b, 0) / downside.length;
  const downsideVariance = downside.reduce((sum, r) => sum + Math.pow(r - downsideMean, 2), 0) / downside.length;
  const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(tradingDays);
  if (downsideDeviation === 0) return 0;
  return (annualReturn - riskFreeRate) / downsideDeviation;
}

export function maxDrawdown(equityCurve: number[]): number {
  let peak = equityCurve[0];
  let maxDd = 0;
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const dd = (peak - val) / peak;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function informationRatio(excessReturns: number[]): number {
  if (excessReturns.length < 2) return 0;
  const mean = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const stdDev = Math.sqrt(
    excessReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (excessReturns.length - 1)
  );
  if (stdDev === 0) return 0;
  return mean / stdDev;
}

export function tStatistic(sampleMean: number, sampleStdDev: number, n: number): number {
  if (sampleStdDev === 0 || n < 2) return 0;
  return sampleMean / (sampleStdDev / Math.sqrt(n));
}

export function pValueFromT(t: number, df: number): number {
  // Approximation using Abramowitz and Stegun
  const x = df / (df + t * t);
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  // Beta-regularized incomplete function approximation
  let p = 1 - 0.5 * Math.pow(x, 0.5);
  for (let i = 1; i <= 100; i += 2) {
    p -= 0.5 * Math.pow(x, i / 2) / i;
  }
  return Math.max(0, Math.min(1, Math.abs(p)));
}

export function pearsonR(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, denomX = 0, denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  const denom = Math.sqrt(denomX * denomY);
  return denom === 0 ? 0 : num / denom;
}
