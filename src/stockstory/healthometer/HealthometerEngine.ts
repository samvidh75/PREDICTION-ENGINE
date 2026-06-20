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
    if (f.roe >= 20) scores.push(85);
    else if (f.roe >= 15) scores.push(70);
    else if (f.roe >= 10) scores.push(55);
    else if (f.roe >= 5) scores.push(40);
    else scores.push(25);
  }
  if (f.roce !== null && f.roce > 0) {
    if (f.roce >= 20) scores.push(85);
    else if (f.roce >= 12) scores.push(65);
    else if (f.roce >= 8) scores.push(50);
    else if (f.roce >= 4) scores.push(35);
    else scores.push(20);
  }
  if (f.operatingMargin !== null) {
    const om = f.operatingMargin;
    if (om >= 20) scores.push(85);
    else if (om >= 12) scores.push(70);
    else if (om >= 8) scores.push(55);
    else if (om >= 4) scores.push(40);
    else if (om >= 0) scores.push(25);
    else scores.push(10);
  }
  if (f.grossMargin !== null) {
    const gm = f.grossMargin;
    if (gm >= 50) scores.push(85);
    else if (gm >= 35) scores.push(70);
    else if (gm >= 20) scores.push(55);
    else if (gm >= 10) scores.push(40);
    else scores.push(25);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreFinancialStrength(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.1) scores.push(90);
    else if (dte <= 0.5) scores.push(80);
    else if (dte <= 1.0) scores.push(65);
    else if (dte <= 2.0) scores.push(45);
    else if (dte <= 3.0) scores.push(30);
    else scores.push(15);
  }
  if (f.currentRatio !== null) {
    const cr = f.currentRatio;
    if (cr >= 2.5) scores.push(80);
    else if (cr >= 1.5) scores.push(70);
    else if (cr >= 1.0) scores.push(55);
    else if (cr >= 0.7) scores.push(35);
    else scores.push(15);
  }
  if (f.fcfYield !== null) {
    const fy = f.fcfYield;
    if (fy >= 0.08) scores.push(85);
    else if (fy >= 0.04) scores.push(70);
    else if (fy >= 0.02) scores.push(55);
    else if (fy >= 0) scores.push(40);
    else scores.push(20);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreGrowth(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.revenueGrowth !== null) {
    const rg = f.revenueGrowth;
    if (rg >= 0.20) scores.push(85);
    else if (rg >= 0.12) scores.push(70);
    else if (rg >= 0.06) scores.push(55);
    else if (rg >= 0) scores.push(40);
    else if (rg >= -0.05) scores.push(25);
    else scores.push(10);
  }
  if (f.profitGrowth !== null) {
    const pg = f.profitGrowth;
    if (pg >= 0.20) scores.push(85);
    else if (pg >= 0.12) scores.push(70);
    else if (pg >= 0.06) scores.push(55);
    else if (pg >= 0) scores.push(40);
    else if (pg >= -0.10) scores.push(25);
    else scores.push(10);
  }
  if (f.epsGrowth !== null) {
    const eg = f.epsGrowth;
    if (eg >= 0.20) scores.push(85);
    else if (eg >= 0.12) scores.push(70);
    else if (eg >= 0.06) scores.push(55);
    else if (eg >= 0) scores.push(40);
    else if (eg >= -0.10) scores.push(25);
    else scores.push(10);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreValuation(f: HealthometerInput['financials']): number | null {
  const scores: number[] = [];
  if (f.peRatio !== null && f.peRatio > 0) {
    const pe = f.peRatio;
    if (pe <= 10) scores.push(85);
    else if (pe <= 18) scores.push(70);
    else if (pe <= 25) scores.push(55);
    else if (pe <= 35) scores.push(40);
    else if (pe <= 50) scores.push(25);
    else scores.push(10);
  }
  if (f.pbRatio !== null && f.pbRatio > 0) {
    const pb = f.pbRatio;
    if (pb <= 1.0) scores.push(85);
    else if (pb <= 2.0) scores.push(70);
    else if (pb <= 3.5) scores.push(55);
    else if (pb <= 5.0) scores.push(40);
    else if (pb <= 8.0) scores.push(25);
    else scores.push(10);
  }
  if (f.evEbitda !== null && f.evEbitda > 0) {
    const ev = f.evEbitda;
    if (ev <= 8) scores.push(80);
    else if (ev <= 12) scores.push(65);
    else if (ev <= 16) scores.push(50);
    else if (ev <= 22) scores.push(35);
    else scores.push(20);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreRisk(f: HealthometerInput['financials'], factors: HealthometerInput['factors'], features: HealthometerInput['features']): number | null {
  const scores: number[] = [];
  const isLowRisk = (s: number) => s >= 70;
  const isModerateRisk = (s: number) => s >= 40;
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.3) scores.push(80);
    else if (dte <= 1.0) scores.push(65);
    else if (dte <= 2.0) scores.push(45);
    else if (dte <= 3.0) scores.push(30);
    else scores.push(15);
  }
  if (f.beta !== null) {
    const b = f.beta;
    if (b <= 0.5) scores.push(85);
    else if (b <= 0.8) scores.push(75);
    else if (b <= 1.1) scores.push(65);
    else if (b <= 1.5) scores.push(50);
    else if (b <= 2.0) scores.push(35);
    else scores.push(20);
  }
  if (factors.riskFactor !== null) {
    const rf = factors.riskFactor;
    if (rf <= 20) scores.push(85);
    else if (rf <= 35) scores.push(70);
    else if (rf <= 50) scores.push(55);
    else if (rf <= 65) scores.push(40);
    else if (rf <= 80) scores.push(25);
    else scores.push(10);
  }
  if (features.volatility !== null) {
    const v = features.volatility;
    if (v <= 0.12) scores.push(85);
    else if (v <= 0.20) scores.push(70);
    else if (v <= 0.30) scores.push(55);
    else if (v <= 0.40) scores.push(40);
    else if (v <= 0.60) scores.push(25);
    else scores.push(10);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreMomentum(f: HealthometerInput['features'], factors: HealthometerInput['factors']): number | null {
  const scores: number[] = [];
  if (f.momentum !== null) {
    const m = f.momentum;
    if (m > 0) {
      if (m >= 2.0) scores.push(85);
      else if (m >= 1.0) scores.push(70);
      else if (m >= 0.5) scores.push(60);
      else scores.push(50);
    } else {
      if (m <= -2.0) scores.push(15);
      else if (m <= -1.0) scores.push(30);
      else if (m <= -0.5) scores.push(40);
      else scores.push(45);
    }
  }
  if (factors.momentumFactor !== null) {
    const mf = factors.momentumFactor;
    if (mf >= 70) scores.push(85);
    else if (mf >= 55) scores.push(70);
    else if (mf >= 40) scores.push(55);
    else if (mf >= 25) scores.push(40);
    else scores.push(20);
  }
  if (f.rsi !== null) {
    const rsi = f.rsi;
    if (rsi >= 60 && rsi <= 70) scores.push(75);
    else if (rsi >= 50) scores.push(60);
    else if (rsi >= 40) scores.push(45);
    else if (rsi >= 30) scores.push(30);
    else scores.push(15);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

function scoreStability(f: HealthometerInput['financials'], features: HealthometerInput['features']): number | null {
  const scores: number[] = [];
  if (f.debtToEquity !== null) {
    const dte = f.debtToEquity;
    if (dte <= 0.2) scores.push(85);
    else if (dte <= 0.5) scores.push(75);
    else if (dte <= 1.0) scores.push(60);
    else if (dte <= 2.0) scores.push(40);
    else scores.push(20);
  }
  if (features.volatility !== null) {
    const v = features.volatility;
    if (v <= 0.10) scores.push(85);
    else if (v <= 0.18) scores.push(70);
    else if (v <= 0.25) scores.push(55);
    else if (v <= 0.35) scores.push(40);
    else scores.push(20);
  }
  if (f.currentRatio !== null) {
    const cr = f.currentRatio;
    if (cr >= 2.0) scores.push(80);
    else if (cr >= 1.2) scores.push(65);
    else if (cr >= 0.8) scores.push(50);
    else scores.push(25);
  }
  if (f.marketCap !== null && f.marketCap > 0) {
    const logMc = Math.log10(f.marketCap);
    if (logMc >= 5) scores.push(85);
    else if (logMc >= 4) scores.push(70);
    else if (logMc >= 3) scores.push(55);
    else if (logMc >= 2) scores.push(40);
    else scores.push(25);
  }
  return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
}

export class HealthometerEngine {
  evaluate(input: HealthometerInput): HealthometerScore {
    const dimensions: ScoredDimension[] = [
      { id: 'quality', label: 'Business quality', score: scoreQuality(input.financials) },
      { id: 'financial_strength', label: 'Financial strength', score: scoreFinancialStrength(input.financials) },
      { id: 'growth', label: 'Growth', score: scoreGrowth(input.financials) },
      { id: 'valuation', label: 'Valuation', score: scoreValuation(input.financials) },
      { id: 'risk', label: 'Risk', score: scoreRisk(input.financials, input.factors, input.features) },
      { id: 'momentum', label: 'Momentum', score: scoreMomentum(input.features, input.factors) },
      { id: 'stability', label: 'Stability', score: scoreStability(input.financials, input.features) },
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
      overallScore = Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length);
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
