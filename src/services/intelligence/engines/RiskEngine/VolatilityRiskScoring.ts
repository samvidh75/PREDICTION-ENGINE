/**
 * Volatility Risk Scoring — 0-25 points
 * Measures price stability risk: σ, 52-week range, beta, max drawdown
 * Higher sub-scores = LOWER risk (more stable)
 */
import type { RiskMetrics } from '../../types';
import logger from '../../../../config/logger';

export interface VolatilityRiskResult {
  sigmaScore: number;
  betaScore: number;
  drawdownScore: number;
  points: number;            // 0-25
  reasoning: string;
}

export function scoreVolatilityRisk(metrics: RiskMetrics): VolatilityRiskResult {
  let sigmaScore: number;
  let betaScore: number;
  let drawdownScore = 0;
  const reasons: string[] = [];

  // ---- SIGMA (0-10 pts) ----
  if (metrics.volatility !== undefined) {
    const σ = metrics.volatility;
    if (σ < 18) {
      sigmaScore = 10;
      reasons.push(`Low volatility (σ=${σ.toFixed(1)}%) earns max sigma score`);
    } else if (σ < 25) {
      sigmaScore = 8;
      reasons.push(`Moderate volatility (σ=${σ.toFixed(1)}%) — normal range`);
    } else if (σ < 35) {
      sigmaScore = 5;
      reasons.push(`Elevated volatility (σ=${σ.toFixed(1)}%) — above average risk`);
    } else if (σ < 50) {
      sigmaScore = 2;
      reasons.push(`High volatility (σ=${σ.toFixed(1)}%) — significant price swings`);
    } else {
      sigmaScore = 0;
      reasons.push(`Extreme volatility (σ=${σ.toFixed(1)}%) — highly speculative`);
    }
  } else {
    reasons.push('Volatility (σ) data not available; defaulting sigma score');
    sigmaScore = 3;
  }

  // ---- BETA (0-5 pts) ----
  if (metrics.beta !== undefined) {
    const β = metrics.beta;
    if (β <= 0) {
      betaScore = 5;
      reasons.push(`Negative/inverse beta (β=${β.toFixed(2)}) — hedging property`);
    } else if (β < 0.8) {
      betaScore = 5;
      reasons.push(`Low beta (β=${β.toFixed(2)}) — defensive`);
    } else if (β < 1.0) {
      betaScore = 4;
      reasons.push(`Moderate beta (β=${β.toFixed(2)}) — in-line with market`);
    } else if (β < 1.2) {
      betaScore = 3;
      reasons.push(`Slightly elevated beta (β=${β.toFixed(2)})`);
    } else if (β < 1.5) {
      betaScore = 1;
      reasons.push(`High beta (β=${β.toFixed(2)}) — amplified market moves`);
    } else {
      betaScore = 0;
      reasons.push(`Very high beta (β=${β.toFixed(2)}) — highly sensitive to market`);
    }
  } else {
    betaScore = 2;
    reasons.push('Beta data not available; defaulting');
  }

  // ---- 52-WEEK RANGE (0-5 pts) ----
  if (metrics.weeklyRange !== undefined) {
    const range = metrics.weeklyRange;
    if (range < 15) {
      drawdownScore += 2; // tight range = stable
      reasons.push(`Tight 52-week range (${range.toFixed(0)}%) — stable`);
    } else if (range < 30) {
      drawdownScore += 1;
    } else {
      reasons.push(`Wide 52-week range (${range.toFixed(0)}%) — volatile`);
    }
  }

  // ---- MAX DRAWDOWN (0-3 pts, combined with range for total 0-5) ----
  if (metrics.maxDrawdown !== undefined) {
    const dd = metrics.maxDrawdown;
    if (dd < 15) {
      drawdownScore += 3;
      reasons.push(`Small max drawdown (${dd.toFixed(1)}%) — resilient`);
    } else if (dd < 25) {
      drawdownScore += 2;
      reasons.push(`Moderate max drawdown (${dd.toFixed(1)}%)`);
    } else if (dd < 40) {
      drawdownScore += 1;
      reasons.push(`Significant max drawdown (${dd.toFixed(1)}%)`);
    } else {
      reasons.push(`Severe max drawdown (${dd.toFixed(1)}%) — deep losses historically`);
    }
  } else {
    drawdownScore += 1; // default partial
    reasons.push('Drawdown data not available');
  }

  // Clamp drawdown to 0-5
  drawdownScore = Math.min(5, Math.max(0, drawdownScore));

  const total = sigmaScore + betaScore + drawdownScore;

  logger.debug({ sigmaScore, betaScore, drawdownScore, total, symbol: metrics.symbol },
    'Volatility Risk scored');

  return {
    sigmaScore,
    betaScore,
    drawdownScore,
    points: total,
    reasoning: reasons.join('. '),
  };
}
