/**
 * Engine 7: Confidence Engine
 * 
 * Inputs: Data completeness, Signal agreement, Risk consistency, Historical stability
 * 
 * Outputs: Very High | High | Medium | Low
 * 
 * Derived from:
 * - Forecasting 1.0: Rolling windows, volatility models, time-series transformations
 * - Attention CLX: Feature importance, temporal relationships, trend confidence
 * 
 * This engine does NOT predict prices. It assesses how much trust to place
 * in the signals from the other six engines.
 */

import {
  EngineInputs,
  ConfidenceEngineOutput,
  ConfidenceLevel,
  clampScore,
  weightedAverage,
} from '../types';

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

    // ── 1. Data Completeness ────────────────────────────────────────
    // How many of the expected fields have actual values?
    const financialFields = [
      'peRatio', 'pbRatio', 'eps', 'dividendYield', 'beta', 'marketCap',
      'fcfYield', 'evEbitda', 'roe', 'roic', 'debtToEquity', 'currentRatio',
      'revenueGrowth', 'profitGrowth', 'epsGrowth', 'fcfGrowth',
      'grossMargin', 'operatingMargin',
    ] as const;
    const presentFinancials = financialFields.filter(
      f => financials[f] !== null && financials[f] !== undefined
    ).length;
    const dataCompleteness = clampScore((presentFinancials / financialFields.length) * 100);

    // Boost if we have historical data
    let completenessBoost = 0;
    if (historical?.featureHistory && historical.featureHistory.length >= 20) completenessBoost += 10;
    if (historical?.factorHistory && historical.factorHistory.length >= 10) completenessBoost += 5;
    const adjustedCompleteness = clampScore(dataCompleteness + completenessBoost);

    // ── 2. Signal Agreement ─────────────────────────────────────────
    // How consistent are the signals from different engines?
    // (When engines agree, confidence is higher. Divergence = lower confidence.)
    let signalAgreement = 50;
    if (crossEngineScores) {
      const scores = [
        crossEngineScores.growth,
        crossEngineScores.quality,
        crossEngineScores.stability,
        crossEngineScores.momentum,
        crossEngineScores.valuation,
        // Risk is inverted — high risk is bad, so we invert for agreement
        100 - crossEngineScores.risk,
      ];

      const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
      const variance =
        scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / scores.length;
      const stdDev = Math.sqrt(variance);

      // Lower standard deviation = higher agreement
      if (stdDev < 8) signalAgreement = 95;
      else if (stdDev < 15) signalAgreement = 80;
      else if (stdDev < 22) signalAgreement = 60;
      else if (stdDev < 30) signalAgreement = 40;
      else signalAgreement = 20;

      // Adjust: if all scores are very high or very low together, that's strong signal
      const allHigh = scores.every(s => s >= 70);
      const allLow = scores.every(s => s <= 30);
      if (allHigh || allLow) signalAgreement = Math.min(100, signalAgreement + 10);
    } else {
      // Fallback: use factor engine cross-factor alignment
      const factorScores = [
        factors.qualityFactor,
        factors.valueFactor,
        factors.growthFactor,
        factors.momentumFactor,
        factors.riskFactor,
      ];
      const mean = factorScores.reduce((s, v) => s + v, 0) / factorScores.length;
      const variance =
        factorScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / factorScores.length;
      signalAgreement = clampScore(100 - Math.sqrt(variance) * 3);
    }

    // ── 3. Risk Consistency (Forecasting 1.0: rolling windows) ──────
    // How stable/consistent is the risk profile over time?
    let riskConsistency = 50;
    if (historical?.factorHistory && historical.factorHistory.length >= 5) {
      const riskHistory = historical.factorHistory.map(h => h.riskFactor);
      const mean = riskHistory.reduce((s, v) => s + v, 0) / riskHistory.length;
      const variance =
        riskHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / riskHistory.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 5) riskConsistency = 90;
      else if (stdDev < 10) riskConsistency = 75;
      else if (stdDev < 15) riskConsistency = 55;
      else if (stdDev < 20) riskConsistency = 35;
      else riskConsistency = 20;
    } else if (features.volatility !== null) {
      // Single-point proxy: very low volatility suggests stable risk profile
      const vol = features.volatility;
      if (vol < 0.15) riskConsistency = 80;
      else if (vol < 0.25) riskConsistency = 65;
      else if (vol < 0.35) riskConsistency = 50;
      else if (vol < 0.50) riskConsistency = 35;
      else riskConsistency = 20;
    }

    // ── 4. Historical Stability (Attention CLX: temporal relationships) ──
    // How stable are the key metrics over time?
    let historicalStability = 50;
    if (historical?.factorHistory && historical.factorHistory.length >= 5) {
      const factorScoresHistory = historical.factorHistory.map(h => h.factorScore);
      const mean = factorScoresHistory.reduce((s, v) => s + v, 0) / factorScoresHistory.length;
      const variance =
        factorScoresHistory.reduce((s, v) => s + Math.pow(v - mean, 2), 0) /
        factorScoresHistory.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev < 4) historicalStability = 90;
      else if (stdDev < 8) historicalStability = 75;
      else if (stdDev < 12) historicalStability = 55;
      else if (stdDev < 18) historicalStability = 35;
      else historicalStability = 20;
    }

    // ── Composite Confidence Score ──────────────────────────────────
    const confidenceScore = weightedAverage([
      { score: adjustedCompleteness, weight: 2 },
      { score: signalAgreement, weight: 3 },
      { score: riskConsistency, weight: 2.5 },
      { score: historicalStability, weight: 2.5 },
    ]);

    const level = this.mapToLevel(confidenceScore);
    const commentary = this.generateCommentary(
      level,
      adjustedCompleteness,
      signalAgreement,
      riskConsistency,
      historicalStability
    );

    return {
      level,
      score: confidenceScore,
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
    stability: number
  ): string {
    if (level === 'Very High') {
      return 'Exceptionally high confidence. Data is comprehensive, signals are aligned across all engines, and historical patterns show consistent behavior. The assessment can be relied upon with high conviction.';
    }

    if (level === 'High') {
      const strengths: string[] = [];
      const concerns: string[] = [];
      if (completeness >= 70) strengths.push('good data coverage');
      else concerns.push('some data gaps');
      if (agreement >= 65) strengths.push('strong signal alignment');
      if (riskConsistency >= 65) strengths.push('consistent risk profile');
      return `High confidence. ${strengths.join(', ')}${concerns.length ? '. Note: ' + concerns.join(', ') : ''}.`;
    }

    if (level === 'Medium') {
      return 'Moderate confidence. Some data gaps or signal divergence reduce conviction. Use this assessment as a directional guide rather than a precise measure.';
    }

    return 'Low confidence. Significant data gaps or highly divergent signals limit the reliability of this assessment. Additional research is recommended before drawing conclusions.';
  }
}

export const confidenceEngine = new ConfidenceEngine();
