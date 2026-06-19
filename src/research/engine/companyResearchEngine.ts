import type { CompanyProfileView, CompanyQuoteView, CompanyFundamentalsView, CompanyFactorScoresView, CompanyThesisView, CompanyRiskView, CompanyPeersView, CompanyHistoryView, InvestReviewContextView, ThesisStatus, RiskLevel } from "../contracts/productContracts";
import type { ResearchConvictionScore } from "./researchEngine";
import { computeResearchConviction } from "./researchEngine";
import { computeQualityFeatures } from "../features/qualityFeatures";
import { computeValuationFeatures } from "../features/valuationFeatures";
import { computeGrowthFeatures } from "../features/growthFeatures";
import { computeRiskFeatures } from "../features/riskFeatures";
import { computeMomentumFeatures } from "../features/momentumFeatures";
import { computeStabilityFeatures } from "../features/stabilityFeatures";
import type { NormalizedFundamentals } from "../normalization/types";
import type { NormalizedCandle } from "../normalization/types";

export interface CompanyResearchInput {
  symbol: string;
  companyName: string | null;
  sector: string | null;
  industry: string | null;
  fundamentals: NormalizedFundamentals | null;
  quote: { lastPrice: number | null; change: number | null; changePercent: number | null; open: number | null; high: number | null; low: number | null; close: number | null; volume: number | null; marketCap: number | null; week52High: number | null; week52Low: number | null; dayRange?: string | null } | null;
  candles: NormalizedCandle[];
  relativeStrength: number | null;
  beta: number | null;
  priorThesisStatus: ThesisStatus | null;
}

export interface CompanyResearchOutput {
  profile: CompanyProfileView;
  quote: CompanyQuoteView;
  fundamentals: CompanyFundamentalsView;
  factorScores: CompanyFactorScoresView;
  thesis: CompanyThesisView;
  risk: CompanyRiskView;
  history: CompanyHistoryView;
  investContext: InvestReviewContextView;
}

export function buildCompanyResearch(input: CompanyResearchInput): CompanyResearchOutput {
  const symbol = input.symbol;
  const fn = input.fundamentals;

  const profile: CompanyProfileView = {
    symbol, companyName: input.companyName ?? symbol, sector: input.sector,
    industry: input.industry, description: null, website: null,
    listingDate: null, faceValue: null, isin: null,
  };

  const quote: CompanyQuoteView = input.quote ? {
    symbol, lastPrice: input.quote.lastPrice, change: input.quote.change,
    changePercent: input.quote.changePercent, open: input.quote.open,
    high: input.quote.high, low: input.quote.low, close: input.quote.close,
    volume: input.quote.volume, marketCap: input.quote.marketCap,
    dayRange: input.quote.dayRange ?? null, week52High: input.quote.week52High,
    week52Low: input.quote.week52Low,
  } : { symbol, lastPrice: null, change: null, changePercent: null, open: null, high: null, low: null, close: null, volume: null, marketCap: null, dayRange: null, week52High: null, week52Low: null };

  const fundamentals: CompanyFundamentalsView = fn ? {
    symbol, peRatio: fn.peRatio, pbRatio: fn.pbRatio, evEbitda: fn.evEbitda,
    dividendYield: fn.dividendYield, eps: fn.eps, bookValue: fn.bookValue,
    roe: fn.roe, roa: fn.roa, roic: fn.roic, debtToEquity: fn.debtToEquity,
    currentRatio: fn.currentRatio, grossMargin: fn.grossMargin,
    operatingMargin: fn.operatingMargin, netMargin: fn.netMargin,
    revenueGrowth: fn.revenueGrowth, profitGrowth: fn.profitGrowth,
    epsGrowth: fn.epsGrowth, sales: fn.sales, netProfit: fn.netProfit,
    operatingProfit: fn.operatingProfit, totalAssets: fn.totalAssets,
    totalDebt: fn.totalDebt, equity: fn.equity, cashFlow: fn.cashFlow,
    freeCashFlow: fn.freeCashFlow,
  } : { symbol, peRatio: null, pbRatio: null, evEbitda: null, dividendYield: null, eps: null, bookValue: null, roe: null, roa: null, roic: null, debtToEquity: null, currentRatio: null, grossMargin: null, operatingMargin: null, netMargin: null, revenueGrowth: null, profitGrowth: null, epsGrowth: null, sales: null, netProfit: null, operatingProfit: null, totalAssets: null, totalDebt: null, equity: null, cashFlow: null, freeCashFlow: null };

  let qualityScore: number | null = null;
  let valuationScore: number | null = null;
  let growthScore: number | null = null;
  let riskScore: number | null = null;
  let momentumScore: number | null = null;
  let stabilityScore: number | null = null;

  if (fn) {
    const qf = computeQualityFeatures(fn);
    qualityScore = qf.overallQuality;

    const vf = computeValuationFeatures(fn);
    valuationScore = vf.overallValuation;

    const gf = computeGrowthFeatures(fn);
    growthScore = gf.overallGrowth;

    const rf = computeRiskFeatures(fn, input.beta);
    riskScore = rf.overallRisk;

    const sf = computeStabilityFeatures(fn, qualityScore, growthScore);
    stabilityScore = sf.overallStability;
  }

  const mf = computeMomentumFeatures(input.candles, input.relativeStrength);
  momentumScore = mf.overallMomentum;

  const conviction = computeResearchConviction({
    quality: qualityScore, valuation: valuationScore,
    growth: growthScore, risk: riskScore,
    momentum: momentumScore, stability: stabilityScore,
  });

  const factorScores: CompanyFactorScoresView = {
    symbol, qualityScore, valuationScore, growthScore, riskScore,
    momentumScore, stabilityScore, convictionScore: conviction.overallScore,
    qualityExplanation: qualityScore !== null ? `Quality score of ${Math.round(qualityScore)}` : null,
    valuationExplanation: valuationScore !== null ? `Valuation score of ${Math.round(valuationScore)}` : null,
    growthExplanation: growthScore !== null ? `Growth score of ${Math.round(growthScore)}` : null,
    riskExplanation: riskScore !== null ? `Risk score of ${Math.round(riskScore)}` : null,
    momentumExplanation: momentumScore !== null ? `Momentum score of ${Math.round(momentumScore)}` : null,
    stabilityExplanation: stabilityScore !== null ? `Stability score of ${Math.round(stabilityScore)}` : null,
  };

  const thesis: CompanyThesisView = buildThesis(symbol, conviction, input.priorThesisStatus);

  const risk: CompanyRiskView = buildRiskView(symbol, fn, input.beta);

  const history: CompanyHistoryView = input.candles.length > 0 ? {
    symbol, priceHistory: input.candles.map(c => ({ date: c.date, close: c.close, high: c.high, low: c.low, volume: c.volume })),
    earliestDate: input.candles.reduce((earliest, c) => c.date < earliest ? c.date : earliest, input.candles[0]?.date ?? null),
    latestDate: input.candles.reduce((latest, c) => c.date > latest ? c.date : latest, input.candles[0]?.date ?? null),
    dataPoints: input.candles.length,
  } : { symbol, priceHistory: [], earliestDate: null, latestDate: null, dataPoints: 0 };

  const investContext: InvestReviewContextView = {
    symbol, companyName: input.companyName ?? symbol,
    conviction: conviction.conviction, score: conviction.overallScore,
    thesis: conviction.explanation,
    keyRisks: conviction.topRisks, keyStrengths: conviction.topContributors,
    whatToWatch: thesis.whatWouldChange,
    missingCriticalData: conviction.overallScore === null ? ["Insufficient data for full research case"] : [],
  };

  return { profile, quote, fundamentals, factorScores, thesis, risk, history, investContext };
}

function buildThesis(symbol: string, conviction: ResearchConvictionScore, priorStatus: ThesisStatus | null): CompanyThesisView {
  if (conviction.overallScore === null) {
    return { symbol, status: "Research signals pending", thesis: null, bullCase: null, bearCase: null, topStrengths: [], topRisks: [], whatWouldChange: [], priorStatus };
  }

  const strengths = conviction.topContributors;
  const risks = conviction.topRisks;

  let status: ThesisStatus;
  if (priorStatus === null) {
    status = "Tracking begins now";
  } else if (conviction.overallScore >= 65) {
    status = priorStatus === "Strengthening" || priorStatus === "Stable" ? "Strengthening" : "Needs review";
  } else if (conviction.overallScore >= 40) {
    status = "Stable";
  } else {
    status = "Weakening";
  }

  const thesis = strengths.length > 0
    ? `Research case centered on ${strengths[0].toLowerCase()}${strengths.length > 1 ? ` and ${strengths[1].toLowerCase()}` : ""}.`
    : null;

  const bullCase = strengths.length > 0
    ? `Strengths: ${strengths.join(", ")}`
    : null;

  const bearCase = risks.length > 0
    ? `Areas to monitor: ${risks.join(", ")}`
    : null;

  const whatWouldChange: string[] = [];
  if (conviction.overallScore !== null && conviction.overallScore < 60) {
    whatWouldChange.push("Improvement in quality and growth metrics would strengthen the research case.");
  }
  if (risks.length > 0) {
    whatWouldChange.push("Reduction in identified risk areas would improve the outlook.");
  }
  if (whatWouldChange.length === 0) {
    whatWouldChange.push("Monitor quarterly results for sustained performance.");
  }

  return { symbol, status, thesis, bullCase, bearCase, topStrengths: strengths, topRisks: risks, whatWouldChange, priorStatus };
}

function buildRiskView(symbol: string, fn: NormalizedFundamentals | null, beta: number | null): CompanyRiskView {
  if (!fn) {
    return { symbol, overallRisk: "Insufficient data", leverageRisk: null, volatilityRisk: null, liquidityRisk: null, earningsRisk: null, sectorRisk: null, keyRiskFlags: [] };
  }

  const flags: string[] = [];
  if (fn.debtToEquity !== null && fn.debtToEquity > 2) flags.push("High leverage");
  if (fn.currentRatio !== null && fn.currentRatio < 0.8) flags.push("Low liquidity");
  if (fn.netProfit !== null && fn.netProfit <= 0) flags.push("Negative earnings");
  if (beta !== null && beta > 1.5) flags.push("High volatility");

  let overallRisk: RiskLevel = "Low";
  if (flags.length >= 2) overallRisk = "High";
  else if (flags.length === 1) overallRisk = "Moderate";
  else if (fn.netProfit === null && fn.debtToEquity === null) overallRisk = "Insufficient data";

  return {
    symbol, overallRisk,
    leverageRisk: fn.debtToEquity !== null ? `Debt/Equity: ${fn.debtToEquity.toFixed(2)}` : null,
    volatilityRisk: beta !== null ? `Beta: ${beta.toFixed(2)}` : null,
    liquidityRisk: fn.currentRatio !== null ? `Current ratio: ${fn.currentRatio.toFixed(2)}` : null,
    earningsRisk: fn.netProfit !== null ? fn.netProfit <= 0 ? "Negative net profit" : "Positive earnings" : null,
    sectorRisk: null,
    keyRiskFlags: flags,
  };
}
