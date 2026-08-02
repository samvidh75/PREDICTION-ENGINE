/**
 * Engine 7: Confidence Engine
 * 
 * Inputs: Data completeness (weighted), Signal agreement, Risk consistency, Historical stability
 * 
 * Outputs: Very High | High | Medium | Low
 * 
 * FIX (RC-ENGINE-002): Critical field gate — missing ROE, ROIC, DebtToEquity,
 *   or FCF yield caps confidence at "Medium" maximum.
 */

import {
  EngineInputs,
  ConfidenceEngineOutput,
  ConfidenceLevel,
  clampScore,
  weightedAverage,
} from '../types';

const CRITICAL_FIELDS = ['roe', 'roic', 'debtToEquity', 'fcfYield'] as const;
const IMPORTANT_FIELDS = ['peRatio', 'pbRatio', 'operatingMargin', 'revenueGrowth', 'epsGrowth', 'currentRatio'] as const;
// All other fields are supplementary weight = 1

export class ConfidenceEngine {
  evaluate(
    inputs: EngineInputs,
    crossEngineScores?: {
      growth: number;
      quality: number;
      stability: number;
      momentum: number;
      valuation: number;
      risk: number;
    }
  ): ConfidenceEngineOutput {
    const { financials, features, factors, historical } = inputs;

    // ── 1. Weighted Data Completeness ──────────────────────────────
    const financialsMap = financials as Record<string, number | null | undefined>;

    let totalWeight = 0;
    let earnedWeight = 0;

    // Critical: weight 3
    for (const field of CRITICAL_FIELDS) {
      const val = financialsMap[field];
      if (val !== null && val !== undefined) earnedWeight += 3;
      totalWeight += 3;
    }

    // Important: weight 2
    for (const field of IMPORTANT_FIELDS) {
      const val = financialsMap[field];
      if (val !== null && val !== undefined) earnedWeight += 2;
      totalWeight += 2;
    }

    // Supplementary (all other financial fields): weight 1
    const supplementaryFields = [
      'eps', 'dividendYield', 'beta', 'marketCap', 'freeFloat',
      'evEbitda', 'profitGrowth', 'fcfGrowth', 'grossMargin',
    ];
    for (const field of supplementaryFields) {
      const val = financialsMap[field];
      if (val !== null && val !== undefined) earnedWeight += 1;
      totalWeight += 1;
    }

    const dataCompleteness = totalWeight > 0
      ? clampScore((earnedWeight / totalWeight) * 100)
      : 50;

    // Boost for historical data
    let completenessBoost = 0;
    if (historical?.featureHistory && historical.featureHistory.length >= 20) completenessBoost += 10;
    if (historical?.factorHistory && historical.factorHistory.length >= 10) completenessBoost += 5;
    const adjustedCompleteness = clampScore(dataCompleteness + completenessBoost);

    // ── 2. Critical Field Gate ─────────────────────────────────────
    // Count missing critical fields
    const missingCritical = CRITICAL_FIELDS.filter(
      f => financialsMap[f] === null || financialsMap[f] === undefined
    ).length;

    // ── 3. Signal Agreement ─────────────────────────────────────────
    let signalAgreement: number;
    if (crossEngineScores) {
      const scores = [
        crossEngineScores.growth,
        crossEngineScores.quality,
        crossEngineScores.stability,
        crossEngineScores.momentum,
        crossEngineScores.valuation,
        100 - crossEngineScores.risk,
      ];

      const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
      const variance = scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 8) signalAgreement = 95;
      else if (stdDev < 15) signalAgreement = 80;
      else if (stdDev < 22) signalAgreement = 60;
      else if (stdDev < 30) signalAgreement = 40;
      else signalAgreement = 20;

      // Penalise agreement on bad news
      const allLow = scores.every(s => s <= 35);
      if (allLow) signalAgreement = Math.min(signalAgreement, 50);
    } else {
      const factorScores = [
        factors.qualityFactor, factors.valueFactor,
        factors.growthFactor, factors.momentumFactor, factors.riskFactor,
      ];
      const mean = factorScores.reduce((s, v) => s + v, 0) / factorScores.length;
      const variance = factorScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / factorScores.length;
      signalAgreement = clampScore(100 - Math.sqrt(variance) * 3);
    }

    // ── 4. Risk Consistency ────────────────────────────────────────
    let riskConsistency = 50;
    if (historical?.factorHistory && historical.factorHistory.length >= 5) {
      const riskHistory = historical.factorHistory.map(h => h.riskFactor);
      const mean = riskHistory.reduce((s, v) => s + v, 0) / riskHistory.length;
      const variance = riskHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / riskHistory.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 5) riskConsistency = 90;
      else if (stdDev < 10) riskConsistency = 75;
      else if (stdDev < 15) riskConsistency = 55;
      else if (stdDev < 20) riskConsistency = 35;
      else riskConsistency = 20;
    } else if (features.volatility !== null) {
      const vol = features.volatility;
      if (vol < 0.15) riskConsistency = 80;
      else if (vol < 0.25) riskConsistency = 65;
      else if (vol < 0.35) riskConsistency = 50;
      else if (vol < 0.50) riskConsistency = 35;
      else riskConsistency = 20;
    }

    // ── 5. Historical Stability ────────────────────────────────────
    let historicalStability = 50;
    if (historical?.factorHistory && historical.factorHistory.length >= 5) {
      const fsHistory = historical.factorHistory.map(h => h.factorScore);
      const mean = fsHistory.reduce((s, v) => s + v, 0) / fsHistory.length;
      const variance = fsHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / fsHistory.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 4) historicalStability = 90;
      else if (stdDev < 8) historicalStability = 75;
      else if (stdDev < 12) historicalStability = 55;
      else if (stdDev < 18) historicalStability = 35;
      else historicalStability = 20;
    }

    // ── Composite Confidence ───────────────────────────────────────
    const rawConfidence = weightedAverage([
      { score: adjustedCompleteness, weight: 2 },
      { score: signalAgreement, weight: 3 },
      { score: riskConsistency, weight: 2.5 },
      { score: historicalStability, weight: 2.5 },
    ]);

    // Apply critical field gate
    let cappedConfidence = rawConfidence;
    if (missingCritical >= 3) {
      cappedConfidence = Math.min(rawConfidence, 30); // Low
    } else if (missingCritical >= 2) {
      cappedConfidence = Math.min(rawConfidence, 55); // Medium
    } else if (missingCritical >= 1) {
      cappedConfidence = Math.min(rawConfidence, 70); // High max
    }

    const level = this.mapToLevel(cappedConfidence);
    const commentary = this.generateCommentary(
      level,
      adjustedCompleteness,
      signalAgreement,
      riskConsistency,
      historicalStability,
      missingCritical
    );

    return {
      level,
      score: cappedConfidence,
      dataCompleteness: adjustedCompleteness,
      signalAgreement,
      riskConsistency,
      historicalStability,
      commentary,
    };
  }

  private mapToLevel(score: number): ConfidenceLevel {
    if (score >= 80) return 'Very High';
    if (score >= 65) return 'High';
    if (score >= 40) return 'Medium';
    return 'Low';
  }

  private generateCommentary(
    level: ConfidenceLevel,
    completeness: number,
    agreement: number,
    riskConsistency: number,
    stability: number,
    missingCritical: number
  ): string {
    if (missingCritical >= 2) {
      return `Confidence is capped at ${level} due to ${missingCritical} missing critical data fields (ROE, ROIC, Debt/Equity, or FCF Yield). Deeper financial data is required for higher conviction.`;
    }

    if (level === 'Very High') {
      return 'Exceptionally high confidence. Comprehensive data coverage with aligned signals across all engines and consistent historical patterns.';
    }

    if (level === 'High') {
      const strengths: string[] = [];
      if (completeness >= 70) strengths.push('good data coverage');
      if (agreement >= 65) strengths.push('strong signal alignment');
      if (riskConsistency >= 65) strengths.push('consistent risk profile');
      return `High confidence. ${strengths.join(', ')}.`;
    }

    if (level === 'Medium') {
      return 'Moderate confidence. Some data gaps or signal divergence reduce conviction. This assessment serves as a directional indicator rather than a precise measure.';
    }

    return 'Low confidence. Significant data gaps or highly divergent signals limit reliability. Additional data and analysis are needed for firmer conclusions.';
  }
}

export const confidenceEngine = new ConfidenceEngine();
