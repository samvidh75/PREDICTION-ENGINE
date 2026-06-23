import type { HealthometerInput, HealthometerScore, HealthometerDimension, HealthometerLabel } from './types';
import { classifyHealthometer } from './labels';

function parseFinite(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

interface ScoredDimension {
  id: string;
  label: string;
  score: number | null;
}

function scoreQuality(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.roe !== null && f.roe > 0) {
    if (f.roe >= 25) scores.push(92);
    else if (f.roe >= 18) scores.push(78);
    else if (f.roe >= 12) scores.push(62);
    else if (f.roe >= 8) scores.push(48);
    else if (f.roe >= 5) scores.push(35);
    else scores.push(20);
  }
  if (f.roce !== null && f.roce > 0) {
    if (f.roce >= 25) scores.push(92);
    else if (f.roce >= 15) scores.push(75);
    else if (f.roce >= 10) scores.push(60);
    else if (f.roce >= 6) scores.push(45);
    else if (f.roce >= 3) scores.push(30);
    else scores.push(15);
  }
  if (f.operatingMargin !== null) {
    const om = f.operatingMargin;
    if (om >= 25) scores.push(90);
    else if (om >= 18) scores.push(75);
    else if (om >= 12) scores.push(60);
    else if (om >= 8) scores.push(48);
    else if (om >= 4) scores.push(35);
    else if (om >= 0) scores.push(20);
    else scores.push(8);
  }
  if (f.grossMargin !== null) {
    const gm = f.grossMargin;
    if (gm >= 60) scores.push(90);
    else if (gm >= 45) scores.push(75);
    else if (gm >= 30) scores.push(60);
    else if (gm >= 20) scores.push(48);
    else if (gm >= 10) scores.push(35);
    else scores.push(20);
  }
  if (f.netMargin !== null) {
    const nm = f.netMargin;
    if (nm >= 15) scores.push(88);
    else if (nm >= 10) scores.push(72);
    else if (nm >= 6) scores.push(58);
    else if (nm >= 3) scores.push(42);
    else if (nm >= 0) scores.push(28);
    else scores.push(12);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreFinancialStrength(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.05) scores.push(95);
    else if (dte <= 0.25) scores.push(85);
    else if (dte <= 0.5) scores.push(72);
    else if (dte <= 1.0) scores.push(58);
    else if (dte <= 1.5) scores.push(42);
    else if (dte <= 2.5) scores.push(28);
    else scores.push(12);
  }
  if (f.currentRatio !== null) {
    const cr = f.currentRatio;
    if (cr >= 3.0) scores.push(85);
    else if (cr >= 2.0) scores.push(75);
    else if (cr >= 1.5) scores.push(65);
    else if (cr >= 1.0) scores.push(50);
    else if (cr >= 0.7) scores.push(32);
    else scores.push(12);
  }
  if (f.fcfYield !== null) {
    const fy = f.fcfYield;
    if (fy >= 0.10) scores.push(90);
    else if (fy >= 0.06) scores.push(75);
    else if (fy >= 0.03) scores.push(60);
    else if (fy >= 0.01) scores.push(45);
    else if (fy >= 0) scores.push(30);
    else scores.push(15);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreGrowth(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.revenueGrowth !== null) {
    const rg = f.revenueGrowth;
    if (rg >= 0.25) scores.push(90);
    else if (rg >= 0.15) scores.push(75);
    else if (rg >= 0.08) scores.push(60);
    else if (rg >= 0.03) scores.push(48);
    else if (rg >= 0) scores.push(35);
    else if (rg >= -0.05) scores.push(20);
    else scores.push(8);
  }
  if (f.profitGrowth !== null) {
    const pg = f.profitGrowth;
    if (pg >= 0.25) scores.push(90);
    else if (pg >= 0.15) scores.push(75);
    else if (pg >= 0.08) scores.push(60);
    else if (pg >= 0.03) scores.push(48);
    else if (pg >= 0) scores.push(35);
    else if (pg >= -0.10) scores.push(20);
    else scores.push(8);
  }
  if (f.epsGrowth !== null) {
    const eg = f.epsGrowth;
    if (eg >= 0.25) scores.push(90);
    else if (eg >= 0.15) scores.push(75);
    else if (eg >= 0.08) scores.push(60);
    else if (eg >= 0.03) scores.push(48);
    else if (eg >= 0) scores.push(35);
    else if (eg >= -0.10) scores.push(20);
    else scores.push(8);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreValuation(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.peRatio !== null && f.peRatio > 0) {
    const pe = f.peRatio;
    if (pe <= 8) scores.push(90);
    else if (pe <= 14) scores.push(75);
    else if (pe <= 20) scores.push(60);
    else if (pe <= 28) scores.push(45);
    else if (pe <= 40) scores.push(28);
    else if (pe <= 60) scores.push(15);
    else scores.push(8);
  }
  if (f.pbRatio !== null && f.pbRatio > 0) {
    const pb = f.pbRatio;
    if (pb <= 0.8) scores.push(90);
    else if (pb <= 1.5) scores.push(75);
    else if (pb <= 2.5) scores.push(60);
    else if (pb <= 4.0) scores.push(45);
    else if (pb <= 6.0) scores.push(28);
    else scores.push(12);
  }
  if (f.evEbitda !== null && f.evEbitda > 0) {
    const ev = f.evEbitda;
    if (ev <= 6) scores.push(85);
    else if (ev <= 10) scores.push(70);
    else if (ev <= 14) scores.push(55);
    else if (ev <= 18) scores.push(40);
    else if (ev <= 25) scores.push(25);
    else scores.push(12);
  }

  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreRisk(f: HealthometerInput['financials'], factors: HealthometerInput['factors'], features: HealthometerInput['features']): number | null {
  const scores: number[] = [];
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.2) scores.push(85);
    else if (dte <= 0.5) scores.push(72);
    else if (dte <= 1.0) scores.push(58);
    else if (dte <= 1.5) scores.push(42);
    else if (dte <= 2.5) scores.push(28);
    else scores.push(12);
  }
  if (f.beta !== null) {
    const b = f.beta;
    if (b <= 0.4) scores.push(90);
    else if (b <= 0.7) scores.push(78);
    else if (b <= 1.0) scores.push(65);
    else if (b <= 1.3) scores.push(50);
    else if (b <= 1.7) scores.push(35);
    else if (b <= 2.2) scores.push(20);
    else scores.push(10);
  }
  if (factors.riskFactor !== null) {
    const rf = factors.riskFactor;
    if (rf <= 15) scores.push(88);
    else if (rf <= 30) scores.push(72);
    else if (rf <= 45) scores.push(58);
    else if (rf <= 60) scores.push(42);
    else if (rf <= 75) scores.push(25);
    else scores.push(10);
  }
  if (features.volatility !== null) {
    const v = features.volatility;
    if (v <= 0.10) scores.push(88);
    else if (v <= 0.18) scores.push(72);
    else if (v <= 0.25) scores.push(58);
    else if (v <= 0.35) scores.push(42);
    else if (v <= 0.50) scores.push(25);
    else scores.push(10);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreMomentum(features: HealthometerInput['features'], factors: HealthometerInput['factors']): number | null {
  const scores: number[] = [];
  if (features.momentum !== null) {
    const m = features.momentum;
    if (m > 0) {
      if (m >= 3.0) scores.push(92);
      else if (m >= 2.0) scores.push(80);
      else if (m >= 1.0) scores.push(68);
      else if (m >= 0.5) scores.push(56);
      else if (m >= 0.2) scores.push(48);
      else scores.push(42);
    } else {
      if (m <= -3.0) scores.push(10);
      else if (m <= -2.0) scores.push(18);
      else if (m <= -1.0) scores.push(28);
      else if (m <= -0.5) scores.push(38);
      else if (m <= -0.2) scores.push(44);
      else scores.push(46);
    }
  }
  if (factors.momentumFactor !== null) {
    const mf = factors.momentumFactor;
    if (mf >= 80) scores.push(90);
    else if (mf >= 65) scores.push(75);
    else if (mf >= 50) scores.push(60);
    else if (mf >= 35) scores.push(45);
    else if (mf >= 20) scores.push(28);
    else scores.push(12);
  }
  if (features.rsi !== null) {
    const rsi = features.rsi;
    if (rsi >= 60 && rsi <= 70) scores.push(80);
    else if (rsi >= 50 && rsi < 60) scores.push(65);
    else if (rsi >= 40 && rsi < 50) scores.push(50);
    else if (rsi >= 30 && rsi < 40) scores.push(35);
    else if (rsi >= 20 && rsi < 30) scores.push(20);
    else scores.push(10);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreStability(f: HealthometerInput['financials'], features: HealthometerInput['features']): number | null {
  const scores: number[] = [];
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.15) scores.push(88);
    else if (dte <= 0.4) scores.push(75);
    else if (dte <= 0.8) scores.push(60);
    else if (dte <= 1.5) scores.push(42);
    else if (dte <= 2.5) scores.push(25);
    else scores.push(12);
  }
  if (features.volatility !== null) {
    const v = features.volatility;
    if (v <= 0.08) scores.push(90);
    else if (v <= 0.15) scores.push(75);
    else if (v <= 0.22) scores.push(58);
    else if (v <= 0.30) scores.push(42);
    else if (v <= 0.40) scores.push(25);
    else scores.push(12);
  }
  if (f.currentRatio !== null) {
    const cr = f.currentRatio;
    if (cr >= 2.5) scores.push(82);
    else if (cr >= 1.5) scores.push(68);
    else if (cr >= 1.0) scores.push(52);
    else if (cr >= 0.7) scores.push(35);
    else scores.push(15);
  }
  if (f.marketCap !== null && f.marketCap > 0) {
    const logMc = Math.log10(f.marketCap);
    if (logMc >= 5.5) scores.push(90);
    else if (logMc >= 4.5) scores.push(75);
    else if (logMc >= 3.5) scores.push(58);
    else if (logMc >= 2.5) scores.push(42);
    else if (logMc >= 1.5) scores.push(28);
    else scores.push(15);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreCashFlowQuality(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.fcfYield !== null) {
    const fy = f.fcfYield;
    if (fy >= 0.08) scores.push(88);
    else if (fy >= 0.04) scores.push(72);
    else if (fy >= 0.02) scores.push(58);
    else if (fy >= 0) scores.push(42);
    else scores.push(20);
  }
  if (f.operatingMargin !== null && f.netMargin !== null && f.operatingMargin > 0) {
    const conversionRatio = f.netMargin / f.operatingMargin;
    if (conversionRatio >= 0.7) scores.push(85);
    else if (conversionRatio >= 0.5) scores.push(70);
    else if (conversionRatio >= 0.3) scores.push(55);
    else scores.push(35);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export class HealthometerEngine {
  evaluate(input: HealthometerInput): HealthometerScore {
    const dimensions: ScoredDimension[] = [
      { id: 'quality', label: 'Business quality', score: scoreQuality(input.financials) },
      { id: 'financial_strength', label: 'Financial strength', score: scoreFinancialStrength(input.financials) },
      { id: 'growth', label: 'Growth trajectory', score: scoreGrowth(input.financials) },
      { id: 'valuation', label: 'Valuation comfort', score: scoreValuation(input.financials) },
      { id: 'risk', label: 'Risk assessment', score: scoreRisk(input.financials, input.factors, input.features) },
      { id: 'momentum', label: 'Momentum', score: scoreMomentum(input.features, input.factors) },
      { id: 'stability', label: 'Stability', score: scoreStability(input.financials, input.features) },
      { id: 'promoter_confidence', label: 'Promoter confidence', score: null },
      { id: 'cash_flow_quality', label: 'Cash flow quality', score: scoreCashFlowQuality(input.financials) },
    ];

    const totalDimensionCount = dimensions.length;

    const resultDimensions: HealthometerDimension[] = dimensions.map((d) => ({
      id: d.id,
      label: d.label,
      score: d.score,
      status: d.score !== null ? 'verified' : 'insufficient',
    }));

    const validScores = dimensions
      .map((d) => d.score)
      .filter((s): s is number => s !== null);

    const validDimensionCount = validScores.length;

    let overallScore: number | null = null;
    if (validScores.length > 0) {
      const weights: Record<string, number> = {
        quality: 0.18,
        financial_strength: 0.14,
        growth: 0.14,
        valuation: 0.12,
        risk: 0.12,
        momentum: 0.10,
        stability: 0.08,
        promoter_confidence: 0.06,
        cash_flow_quality: 0.06,
      };
      let weightedSum = 0;
      let totalWeight = 0;
      for (const d of dimensions) {
        if (d.score !== null) {
          const w = weights[d.id] ?? 0.10;
          weightedSum += d.score * w;
          totalWeight += w;
        }
      }
      overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
    }

    const label: HealthometerLabel = classifyHealthometer(overallScore, validDimensionCount, totalDimensionCount);

    return {
      overallScore,
      label,
      dimensions: resultDimensions,
      validDimensionCount,
      totalDimensionCount,
    };
  }
}

export const healthometerEngine = new HealthometerEngine();
