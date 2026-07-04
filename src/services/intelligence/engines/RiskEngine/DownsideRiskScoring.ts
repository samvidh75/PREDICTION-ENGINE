/**
 * Downside Risk Scoring — 0-20 points
 * Measures protection against adverse scenarios: -20% revenue profitability,
 * Sharpe ratio, Value at Risk
 * Higher sub-scores = LOWER downside risk
 */
import type { RiskMetrics } from '../../types';
import logger from '../../../../config/logger';

export interface DownsideRiskResult {
  scenarioScore: number;
  sharpeScore: number;
  varScore: number;
  points: number;            // 0-20
  reasoning: string;
}

export function scoreDownsideRisk(metrics: RiskMetrics): DownsideRiskResult {
  let scenarioScore: number;
  let sharpeScore: number;
  let varScore: number;
  const reasons: string[] = [];

  // ---- SCENARIO: PROFITABLE AT -20% REVENUE (0-10 pts) ----
  if (metrics.profitabilityAtMinus20Revenue !== undefined) {
    if (metrics.profitabilityAtMinus20Revenue) {
      scenarioScore = 10;
      reasons.push('Company remains profitable under -20% revenue scenario — strong downside resilience');
    } else {
      scenarioScore = 2;
      reasons.push('Company would be unprofitable at -20% revenue — vulnerable to downturns');
    }
  } else {
    scenarioScore = 3;
    reasons.push('Scenario profitability data not available');
  }

  // ---- SHARPE RATIO (0-5 pts) ----
  if (metrics.sharpeRatio !== undefined) {
    const sr = metrics.sharpeRatio;
    if (sr > 2.0) {
      sharpeScore = 5;
      reasons.push(`Outstanding risk-adjusted returns (Sharpe=${sr.toFixed(2)})`);
    } else if (sr > 1.2) {
      sharpeScore = 4;
      reasons.push(`Good risk-adjusted returns (Sharpe=${sr.toFixed(2)})`);
    } else if (sr > 0.8) {
      sharpeScore = 3;
      reasons.push(`Adequate risk-adjusted returns (Sharpe=${sr.toFixed(2)})`);
    } else if (sr > 0.5) {
      sharpeScore = 2;
      reasons.push(`Below-average risk-adjusted returns (Sharpe=${sr.toFixed(2)})`);
    } else if (sr > 0) {
      sharpeScore = 1;
      reasons.push(`Poor risk-adjusted returns (Sharpe=${sr.toFixed(2)}) — risk may not be rewarded`);
    } else {
      sharpeScore = 0;
      reasons.push(`Negative Sharpe ratio (${sr.toFixed(2)}) — risk-free outperforms`);
    }
  } else {
    sharpeScore = 1;
    reasons.push('Sharpe ratio data not available');
  }

  // ---- VALUE AT RISK (0-5 pts) — lower VaR = more points ----
  if (metrics.valueAtRisk !== undefined) {
    const varVal = metrics.valueAtRisk;
    if (varVal < 1) {
      varScore = 5;
      reasons.push(`Very low VaR (${varVal.toFixed(2)}% daily) — minimal tail loss`);
    } else if (varVal < 2) {
      varScore = 4;
      reasons.push(`Low VaR (${varVal.toFixed(2)}% daily) — well-contained risk`);
    } else if (varVal < 3) {
      varScore = 3;
      reasons.push(`Moderate VaR (${varVal.toFixed(2)}% daily) — acceptable`);
    } else if (varVal < 5) {
      varScore = 1;
      reasons.push(`High VaR (${varVal.toFixed(2)}% daily) — significant tail exposure`);
    } else {
      varScore = 0;
      reasons.push(`Extreme VaR (${varVal.toFixed(2)}% daily) — excessive tail risk`);
    }
  } else {
    varScore = 1;
    reasons.push('Value at Risk data not available');
  }

  const total = scenarioScore + sharpeScore + varScore;

  logger.debug({
    scenarioScore, sharpeScore, varScore,
    total, symbol: metrics.symbol,
  }, 'Downside Risk scored');

  return {
    scenarioScore,
    sharpeScore,
    varScore,
    points: total,
    reasoning: reasons.join('. '),
  };
}
