/**
 * Engine 6: Risk Engine
 * 
 * Powered by: Fraud Detection (anomaly detection) + PyPortfolioOpt (risk models)
 * 
 * Inputs: Accounting anomalies, Cash flow stress, Volatility
 * 
 * NOTE: Score is 0-100 where HIGHER = MORE RISKY.
 * 
 * FIX (RC-ENGINE-002): Debt stress REMOVED — debt ownership lives exclusively
 *   in StabilityEngine. Debt double-counting eliminated.
 * FIX (RC-ENGINE-002): Accounting anomaly detection refined — removed gross margin
 *   outlier as anomaly (false positive for tech/SaaS).
 */

import { EngineInputs, RiskEngineOutput, clampScore, weightedAverage } from '../types';

export class RiskEngine {
  evaluate(inputs: EngineInputs): RiskEngineOutput {
    const { financials, features, historical } = inputs;

    // ── 1. Accounting Anomaly Score ─────────────────────────────────
    let redFlagCount = 0;
    let anomalySignals = 0;

    // Revenue growth vs EPS growth divergence
    if (financials.revenueGrowth !== null && financials.epsGrowth !== null) {
      const divergence = Math.abs(financials.revenueGrowth - financials.epsGrowth);
      const epsGrowth = financials.epsGrowth;
      const revGrowth = financials.revenueGrowth;

      // Only flag when EPS outpaces revenue (potential accrual inflation)
      // Revenue outpacing EPS is legitimate investment
      if (epsGrowth > revGrowth && divergence > 0.20) {
        anomalySignals += 0.35;
        redFlagCount++;
      } else if (epsGrowth > revGrowth && divergence > 0.10) {
        anomalySignals += 0.15;
      }
    } else if (financials.profitGrowth !== null && financials.revenueGrowth !== null) {
      const pg = financials.profitGrowth;
      const rg = financials.revenueGrowth;
      const divergence = Math.abs(pg - rg);

      if (pg > rg && divergence > 0.20) {
        anomalySignals += 0.35;
        redFlagCount++;
      } else if (pg > rg && divergence > 0.10) {
        anomalySignals += 0.15;
      }
    }

    // Negative earnings with high market cap — anomaly
    if (financials.peRatio !== null && financials.peRatio <= 0 &&
        financials.marketCap !== null && financials.marketCap > 10000) {
      anomalySignals += 0.25;
      redFlagCount++;
    }

    // Operating margin negative but EPS positive = earnings quality concern
    if (financials.operatingMargin !== null && financials.operatingMargin < 0 &&
        financials.epsGrowth !== null && financials.epsGrowth > 0.05) {
      anomalySignals += 0.3;
      redFlagCount++;
    }

    const accountingAnomalyScore = clampScore(anomalySignals * 100);

    // ── 2. Cash Flow Stress Score ───────────────────────────────────
    let cashFlowStressScore = 50;
    const fcfYield = financials.fcfYield;
    if (fcfYield !== null) {
      if (fcfYield < -0.05) cashFlowStressScore = 90;
      else if (fcfYield < 0) cashFlowStressScore = 75;
      else if (fcfYield < 0.02) cashFlowStressScore = 55;
      else if (fcfYield < 0.05) cashFlowStressScore = 35;
      else cashFlowStressScore = 20;
    }

    // Operating margin deterioration proxy
    if (financials.operatingMargin !== null && financials.operatingMargin < 0.05) {
      cashFlowStressScore = Math.min(95, cashFlowStressScore + 15);
    }

    // ── 3. Volatility Risk Score ────────────────────────────────────
    let volatilityRiskScore = 50;
    if (features.volatility !== null) {
      const vol = features.volatility;
      if (vol > 0.60) volatilityRiskScore = 90;
      else if (vol > 0.45) volatilityRiskScore = 75;
      else if (vol > 0.35) volatilityRiskScore = 60;
      else if (vol > 0.25) volatilityRiskScore = 45;
      else if (vol > 0.15) volatilityRiskScore = 30;
      else volatilityRiskScore = 15;
    }

    // Beta amplified risk
    if (financials.beta !== null) {
      const beta = financials.beta;
      if (beta > 2.0) volatilityRiskScore = Math.min(95, volatilityRiskScore + 20);
      else if (beta > 1.5) volatilityRiskScore = Math.min(95, volatilityRiskScore + 10);
      else if (beta < 0.5) volatilityRiskScore = Math.max(5, volatilityRiskScore - 10);
    }

    // Historical volatility trend (rolling window)
    if (historical?.featureHistory && historical.featureHistory.length >= 10) {
      const recentVol = historical.featureHistory.slice(-10);
      const volValues = recentVol.map(h => h.volatility).filter(v => v !== null);
      const volTrend = this.linearTrend(volValues.map((v, i) => ({ x: i, y: v })));
      if (volTrend > 0.01) {
        volatilityRiskScore = Math.min(95, volatilityRiskScore + 10);
      }
    }

    // ── Composite Risk Score ────────────────────────────────────────
    const compositeScore = weightedAverage([
      { score: accountingAnomalyScore, weight: 2.5 },
      { score: cashFlowStressScore, weight: 3.5 },
      { score: volatilityRiskScore, weight: 4 },
    ]);

    const commentary = this.generateCommentary(compositeScore, redFlagCount, financials);

    return {
      score: compositeScore,
      accountingAnomalyScore,
      debtStressScore: 50, // Stub: debt lives in StabilityEngine now
      cashFlowStressScore,
      volatilityRiskScore,
      redFlagCount,
      commentary,
    };
  }

  private linearTrend(points: Array<{ x: number; y: number }>): number {
    if (points.length < 2) return 0;
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (denom === 0) return 0;
    return (n * sumXY - sumX * sumY) / denom;
  }

  private generateCommentary(
    score: number,
    redFlags: number,
    f: EngineInputs['financials']
  ): string {
    if (score >= 75) {
      const parts: string[] = [`${redFlags} red flag(s) detected`];
      if (f.fcfYield !== null && f.fcfYield < 0) parts.push('negative free cash flow');
      return `ELEVATED RISK: ${parts.join(', ')}. Multiple stress signals warrant careful scrutiny.`;
    }

    if (score >= 55) {
      return 'Moderate-to-elevated risk. Some stress indicators are present. Position sizing and risk management considerations apply.';
    }

    if (score >= 35) {
      return 'Contained risk profile. Most metrics are within acceptable ranges with no significant stress signals.';
    }

    return 'Low risk. Cash flow and volatility metrics show stability with no material red flags detected.';
  }
}

export const riskEngine = new RiskEngine();
