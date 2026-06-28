/**
 * Business Risk Scoring — 0-20 points
 * Measures operational stability: customer concentration, revenue predictability,
 * competitive moat, management execution
 * Higher sub-scores = LOWER risk (more resilient business)
 */
import type { RiskMetrics } from '../../types';
import logger from '../../../../config/logger';

export interface BusinessRiskResult {
  concentrationScore: number;
  predictabilityScore: number;
  moatScore: number;
  executionScore: number;
  points: number;            // 0-20
  reasoning: string;
}

export function scoreBusinessRisk(metrics: RiskMetrics): BusinessRiskResult {
  let concentrationScore = 0;
  let predictabilityScore = 0;
  let moatScore = 0;
  let executionScore = 0;
  const reasons: string[] = [];

  // ---- CUSTOMER CONCENTRATION (0-5 pts) ----
  if (metrics.customerConcentration !== undefined) {
    const cc = metrics.customerConcentration;
    if (cc < 10) {
      concentrationScore = 5;
      reasons.push(`Highly diversified customer base (top cust=${cc.toFixed(0)}%) — minimal concentration risk`);
    } else if (cc < 20) {
      concentrationScore = 4;
      reasons.push(`Well-diversified customers (top cust=${cc.toFixed(0)}%)`);
    } else if (cc < 30) {
      concentrationScore = 3;
      reasons.push(`Moderate concentration (top cust=${cc.toFixed(0)}%)`);
    } else if (cc < 50) {
      concentrationScore = 1;
      reasons.push(`High customer concentration (top cust=${cc.toFixed(0)}%) — one-client risk`);
    } else {
      concentrationScore = 0;
      reasons.push(`Extreme concentration (top cust=${cc.toFixed(0)}%) — single-point-of-failure risk`);
    }
  } else {
    concentrationScore = 2;
    reasons.push('Customer concentration data not available');
  }

  // ---- REVENUE PREDICTABILITY (0-5 pts) ----
  if (metrics.revenuePredictability !== undefined) {
    const rp = metrics.revenuePredictability;
    if (rp > 0.8) {
      predictabilityScore = 5;
      reasons.push('Highly predictable/recurring revenue — subscription-like stability');
    } else if (rp > 0.6) {
      predictabilityScore = 4;
      reasons.push('Good revenue visibility — mostly recurring');
    } else if (rp > 0.4) {
      predictabilityScore = 3;
      reasons.push('Moderate predictability — mix of recurring and transactional');
    } else if (rp > 0.2) {
      predictabilityScore = 1;
      reasons.push('Low predictability — largely transactional revenue');
    } else {
      predictabilityScore = 0;
      reasons.push('Very low predictability — highly variable or project-based');
    }
  } else {
    predictabilityScore = 2;
    reasons.push('Revenue predictability data not available');
  }

  // ---- COMPETITIVE MOAT (0-5 pts) ----
  if (metrics.competitiveMoat !== undefined) {
    const cm = metrics.competitiveMoat;
    if (cm > 0.8) {
      moatScore = 5;
      reasons.push('Strong competitive moat — wide economic advantages');
    } else if (cm > 0.6) {
      moatScore = 4;
      reasons.push('Solid moat — defensible market position');
    } else if (cm > 0.4) {
      moatScore = 3;
      reasons.push('Moderate moat — some competitive advantages');
    } else if (cm > 0.2) {
      moatScore = 1;
      reasons.push('Weak moat — vulnerable to competition');
    } else {
      moatScore = 0;
      reasons.push('No moat — commodity-like, easily displaced');
    }
  } else {
    moatScore = 2;
    reasons.push('Competitive moat data not available');
  }

  // ---- EXECUTION RISK (0-5 pts) — inverted from "executionRisk" ----
  if (metrics.executionRisk !== undefined) {
    const er = metrics.executionRisk;
    if (er > 0.8) {
      executionScore = 5;
      reasons.push('Strong management execution track record');
    } else if (er > 0.6) {
      executionScore = 4;
      reasons.push('Good execution capability');
    } else if (er > 0.4) {
      executionScore = 3;
      reasons.push('Adequate execution — mixed track record');
    } else if (er > 0.2) {
      executionScore = 1;
      reasons.push('Weak execution — frequent misses');
    } else {
      executionScore = 0;
      reasons.push('Poor execution — high management risk');
    }
  } else {
    executionScore = 2;
    reasons.push('Execution risk data not available');
  }

  const total = concentrationScore + predictabilityScore + moatScore + executionScore;

  logger.debug({
    concentrationScore, predictabilityScore, moatScore, executionScore,
    total, symbol: metrics.symbol,
  }, 'Business Risk scored');

  return {
    concentrationScore,
    predictabilityScore,
    moatScore,
    executionScore,
    points: total,
    reasoning: reasons.join('. '),
  };
}
