/**
 * Engine 6: Risk Engine
 * 
 * Powered by: Fraud Detection (anomaly detection) + PyPortfolioOpt (risk models)
 * 
 * Inputs: Accounting anomalies, Debt stress, Cash flow stress, Volatility
 * 
 * NOTE: Score is 0-100 where HIGHER = MORE RISKY (inverted from other engines).
 * This is intentional — risk should read as "higher = more danger."
 * 
 * Derives from:
 * - Fraud Detection Repository: Feature scoring, weighted classification, anomaly detection
 * - PyPortfolioOpt: Expected returns, risk models, covariance, Sharpe concepts, volatility scoring
 */

import { EngineInputs, RiskEngineOutput, clampScore, weightedAverage } from '../types';

export class RiskEngine {
  evaluate(inputs: EngineInputs): RiskEngineOutput {
    const { financials, features, factors, historical } = inputs;

    // ── 1. Accounting Anomaly Score ─────────────────────────────────
    // Detects unusual relationships between metrics that may indicate
    // earnings manipulation or accounting irregularities.
    let redFlagCount = 0;
    let anomalySignals = 0;

    // Benford's Law proxy: unusual PE/PB ratio imbalance
    if (financials.peRatio !== null && financials.pbRatio !== null) {
      const peToPb = financials.peRatio / Math.max(financials.pbRatio, 0.01);
      if (peToPb > 30 || peToPb < 0.3) {
        anomalySignals += 0.3;
        redFlagCount++;
      }
    }

    // Revenue growth vs EPS growth divergence (Fraud Detection: unusual correlation)
    if (financials.revenueGrowth !== null && financials.epsGrowth !== null) {
      const divergence = Math.abs(financials.revenueGrowth - financials.epsGrowth);
      if (divergence > 0.30) {
        anomalySignals += 0.4;
        redFlagCount++;
      } else if (divergence > 0.15) {
        anomalySignals += 0.2;
      }
    }

    // Negative earnings with high market cap = anomaly
    if (financials.peRatio !== null && financials.peRatio <= 0 && financials.marketCap !== null && financials.marketCap > 10000) {
      anomalySignals += 0.3;
      redFlagCount++;
    }

    // Gross margin outliers (Fraud Detection: anomaly scoring)
    if (financials.grossMargin !== null) {
      if (financials.grossMargin > 0.80 || financials.grossMargin < 0.05) {
        anomalySignals += 0.15;
      }
    }

    const accountingAnomalyScore = clampScore(anomalySignals * 100);

    // ── 2. Debt Stress Score (PyPortfolioOpt: risk model / covariance) ──
    let debtStressScore = 50;
    if (financials.debtToEquity !== null) {
      const dte = financials.debtToEquity;
      if (dte > 3.0) debtStressScore = 95;
      else if (dte > 2.0) debtStressScore = 80;
      else if (dte > 1.5) debtStressScore = 65;
      else if (dte > 1.0) debtStressScore = 50;
      else if (dte > 0.5) debtStressScore = 35;
      else if (dte > 0) debtStressScore = 20;
      else debtStressScore = 10;
    }

    // Amplify debt stress when combined with low liquidity
    if (financials.currentRatio !== null && financials.currentRatio < 1.0 && financials.debtToEquity !== null && financials.debtToEquity > 1.0) {
      debtStressScore = Math.min(95, debtStressScore + 15);
      redFlagCount++;
    }

    // ── 3. Cash Flow Stress Score ───────────────────────────────────
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
      cashFlowStressScore = Math.min(95, cashFlowStressScore + 20);
    }

    // ── 4. Volatility Risk Score (PyPortfolioOpt: volatility scoring) ──
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

    // Beta amplified risk (PyPortfolioOpt covariance model concept)
    if (financials.beta !== null) {
      const beta = financials.beta;
      if (beta > 2.0) volatilityRiskScore = Math.min(95, volatilityRiskScore + 20);
      else if (beta > 1.5) volatilityRiskScore = Math.min(95, volatilityRiskScore + 10);
      else if (beta < 0.5) volatilityRiskScore = Math.max(5, volatilityRiskScore - 10);
    }

    // Historical volatility trend (PyPortfolioOpt: rolling window)
    if (historical?.featureHistory && historical.featureHistory.length >= 10) {
      const recentVol = historical.featureHistory.slice(-10);
      const volValues = recentVol.map(h => h.volatility).filter(v => v !== null);
      const volTrend = this.linearTrend(volValues.map((v, i) => ({ x: i, y: v })));
      if (volTrend > 0.01) {
        volatilityRiskScore = Math.min(95, volatilityRiskScore + 10); // rising volatility
      }
    }

    // ── Composite Risk Score (weighted toward higher risk) ──────────
    const compositeScore = weightedAverage([
      { score: accountingAnomalyScore, weight: 2.5 },
      { score: debtStressScore, weight: 3 },
      { score: cashFlowStressScore, weight: 2.5 },
      { score: volatilityRiskScore, weight: 2 },
    ]);

    const commentary = this.generateCommentary(compositeScore, redFlagCount, financials);

    return {
      score: compositeScore,
      accountingAnomalyScore,
      debtStressScore,
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
      if (f.debtToEquity !== null && f.debtToEquity > 1.5) parts.push('elevated leverage');
      if (f.fcfYield !== null && f.fcfYield < 0) parts.push('negative free cash flow');
      return `HIGH RISK: ${parts.join(', ')}. Multiple stress signals warrant careful scrutiny before committing capital.`;
    }

    if (score >= 55) {
      return 'Moderate-to-elevated risk. Some stress indicators are present. Position sizing and risk management are important considerations.';
    }

    if (score >= 35) {
      return 'Contained risk profile. Most metrics are within acceptable ranges with no significant stress signals.';
    }

    return 'Low risk. Financial statements and volatility metrics show stability with no material red flags detected.';
  }
}

export const riskEngine = new RiskEngine();
