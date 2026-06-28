/**
 * Tail Risk Scoring — 0-15 points
 * Measures extreme/black-swan event exposure: regulatory, litigation,
 * product obsolescence, and market disruption risks
 * Higher sub-scores = LOWER tail risk
 * Note: tailRisk inputs are 0-1 where 0 = no risk, 1 = extreme risk
 */
import type { RiskMetrics } from '../../types';
import logger from '../../../../config/logger';

export interface TailRiskResult {
  regulatoryScore: number;
  litigationScore: number;
  obsolescenceScore: number;
  disruptionScore: number;
  points: number;            // 0-15
  reasoning: string;
}

export function scoreTailRisk(metrics: RiskMetrics): TailRiskResult {
  let regulatoryScore = 0;
  let litigationScore = 0;
  let obsolescenceScore = 0;
  let disruptionScore = 0;
  const reasons: string[] = [];

  // ---- REGULATORY / POLITICAL RISK (0-4 pts) — inverted ----
  if (metrics.regulatoryRisk !== undefined) {
    const rr = metrics.regulatoryRisk; // 0-1, 0 = no risk
    if (rr < 0.1) {
      regulatoryScore = 4;
      reasons.push('Minimal regulatory/political exposure');
    } else if (rr < 0.25) {
      regulatoryScore = 3;
      reasons.push('Low regulatory risk — stable environment');
    } else if (rr < 0.5) {
      regulatoryScore = 2;
      reasons.push('Moderate regulatory headwinds');
    } else if (rr < 0.75) {
      regulatoryScore = 1;
      reasons.push('Significant regulatory/political risk');
    } else {
      regulatoryScore = 0;
      reasons.push('Severe regulatory/political risk — possible adverse action');
    }
  } else {
    regulatoryScore = 2;
    reasons.push('Regulatory risk data not available');
  }

  // ---- LITIGATION RISK (0-4 pts) — inverted ----
  if (metrics.litigationRisk !== undefined) {
    const lr = metrics.litigationRisk;
    if (lr < 0.1) {
      litigationScore = 4;
      reasons.push('No material litigation exposure');
    } else if (lr < 0.25) {
      litigationScore = 3;
      reasons.push('Low litigation risk');
    } else if (lr < 0.5) {
      litigationScore = 2;
      reasons.push('Ongoing litigation of moderate concern');
    } else if (lr < 0.75) {
      litigationScore = 1;
      reasons.push('Significant litigation — potential material impact');
    } else {
      litigationScore = 0;
      reasons.push('Severe litigation risk — existential legal threat');
    }
  } else {
    litigationScore = 2;
    reasons.push('Litigation risk data not available');
  }

  // ---- PRODUCT OBSOLESCENCE RISK (0-4 pts) — inverted ----
  if (metrics.obsolescenceRisk !== undefined) {
    const or = metrics.obsolescenceRisk;
    if (or < 0.1) {
      obsolescenceScore = 4;
      reasons.push('Products have strong staying power — low obsolescence risk');
    } else if (or < 0.25) {
      obsolescenceScore = 3;
      reasons.push('Low obsolescence risk — durable product lines');
    } else if (or < 0.5) {
      obsolescenceScore = 2;
      reasons.push('Moderate obsolescence risk — evolving industry');
    } else if (or < 0.75) {
      obsolescenceScore = 1;
      reasons.push('High obsolescence risk — rapidly changing technology');
    } else {
      obsolescenceScore = 0;
      reasons.push('Extreme obsolescence risk — product may become irrelevant');
    }
  } else {
    obsolescenceScore = 2;
    reasons.push('Obsolescence risk data not available');
  }

  // ---- MARKET DISRUPTION RISK (0-3 pts) — inverted ----
  if (metrics.disruptionRisk !== undefined) {
    const dr = metrics.disruptionRisk;
    if (dr < 0.1) {
      disruptionScore = 3;
      reasons.push('Well-insulated from market disruption');
    } else if (dr < 0.3) {
      disruptionScore = 2;
      reasons.push('Low disruption risk — strong market position');
    } else if (dr < 0.6) {
      disruptionScore = 1;
      reasons.push('Moderate disruption risk — industry under transformation');
    } else {
      disruptionScore = 0;
      reasons.push('High disruption risk — business model under threat');
    }
  } else {
    disruptionScore = 1;
    reasons.push('Disruption risk data not available');
  }

  const total = regulatoryScore + litigationScore + obsolescenceScore + disruptionScore;

  logger.debug({
    regulatoryScore, litigationScore, obsolescenceScore, disruptionScore,
    total, symbol: metrics.symbol,
  }, 'Tail Risk scored');

  return {
    regulatoryScore,
    litigationScore,
    obsolescenceScore,
    disruptionScore,
    points: total,
    reasoning: reasons.join('. '),
  };
}
