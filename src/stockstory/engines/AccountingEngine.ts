/**
 * Accounting Engine
 * 
 * Measures:
 * - Cash conversion quality (OCF / Net Income)
 * - Accrual quality (low accruals = higher quality earnings)
 * - Receivable growth risk (receivables growing faster than revenue)
 * - Working capital quality
 * 
 * Higher score = better accounting quality.
 * This feeds into the Risk Engine and Confidence Engine indirectly
 * by providing a quality signal about the reliability of reported numbers.
 */

import { EngineInputs, clampScore, weightedAverage } from '../types';

export interface AccountingEngineOutput {
  score: number;               // 0-100 (higher = better quality)
  cashConversionScore: number;
  accrualQualityScore: number;
  receivableRiskScore: number;
  workingCapitalScore: number;
  commentary: string;
}

export class AccountingEngine {
  evaluate(inputs: EngineInputs): AccountingEngineOutput {
    const { financials } = inputs;

    // ── 1. Cash Conversion Quality ─────────────────────────────────
    // Measures proportion of earnings backed by operating cash flow.
    // Proxy: we don't have OCF directly, so we derive from:
    // - FCF Yield (if positive, suggests cash generation)
    // - Operating Margin vs Earnings Growth divergence
    // - Revenue Growth vs Receivable proxy (if earnings growing faster than
    //   revenue, accruals may be inflating)

    let cashConversionScore = 50;
    if (financials.fcfYield !== null) {
      const fy = financials.fcfYield;
      if (fy >= 0.08) cashConversionScore = 90;      // strong cash generation
      else if (fy >= 0.05) cashConversionScore = 80;
      else if (fy >= 0.03) cashConversionScore = 65;
      else if (fy >= 0) cashConversionScore = 45;     // positive but weak
      else cashConversionScore = 15;                   // negative FCF — poor conversion
    }

    // ── 2. Accrual Quality ────────────────────────────────────────
    // Detects unusual divergence between revenue and earnings that may
    // indicate accrual-based earnings management.
    // Low divergence = high quality (earnings track revenue).
    let accrualQualityScore = 50;

    if (financials.revenueGrowth !== null && financials.epsGrowth !== null) {
      const revGrowth = financials.revenueGrowth;
      const epsGrowth = financials.epsGrowth;
      const divergence = Math.abs(epsGrowth - revGrowth);

      if (epsGrowth > revGrowth && epsGrowth > 0.15) {
        // EPS growing much faster than revenue = potential accrual inflation
        if (divergence > 0.25) accrualQualityScore = 20;
        else if (divergence > 0.15) accrualQualityScore = 35;
        else if (divergence > 0.08) accrualQualityScore = 50;
        else accrualQualityScore = 65;
      } else if (epsGrowth < revGrowth && revGrowth > 0.10) {
        // Revenue growing faster than EPS = investing for growth (legitimate)
        accrualQualityScore = 70;
      } else {
        accrualQualityScore = 55; // in line
      }
    } else if (financials.profitGrowth !== null && financials.revenueGrowth !== null) {
      const pg = financials.profitGrowth;
      const rg = financials.revenueGrowth;
      const divergence = Math.abs(pg - rg);

      if (divergence > 0.20) accrualQualityScore = 25;
      else if (divergence > 0.10) accrualQualityScore = 45;
      else accrualQualityScore = 60;
    }

    // Negative operating margin with positive EPS growth = red flag
    if (financials.operatingMargin !== null && financials.operatingMargin < 0.03 &&
        financials.epsGrowth !== null && financials.epsGrowth > 0.10) {
      accrualQualityScore = Math.max(10, accrualQualityScore - 30);
    }

    // ── 3. Receivable Growth Risk ─────────────────────────────────
    // If revenue is growing but FCF is deteriorating, suggests
    // revenue quality issues (stretching credit terms).
    let receivableRiskScore = 50;

    if (financials.revenueGrowth !== null && financials.fcfYield !== null) {
      const rg = financials.revenueGrowth;
      const fy = financials.fcfYield;

      if (rg > 0.10 && fy < 0) {
        receivableRiskScore = 20; // growing revenue but negative FCF = aggressive receivables
      } else if (rg > 0.15 && fy >= 0 && fy < 0.02) {
        receivableRiskScore = 35; // strong growth, weak cash conversion
      } else if (rg > 0.05 && fy >= 0.05) {
        receivableRiskScore = 85; // growth with strong cash — healthy
      } else if (rg <= 0 && fy >= 0.05) {
        receivableRiskScore = 70; // flat/declining but cash-generative
      } else {
        receivableRiskScore = 50;
      }
    }

    // ── 4. Working Capital Quality ────────────────────────────────
    // Proxy: current ratio combined with FCF yield.
    // Strong current ratio + strong FCF = healthy working capital management.
    let workingCapitalScore = 50;

    if (financials.currentRatio !== null) {
      const cr = financials.currentRatio;
      if (cr >= 2.0) workingCapitalScore = 75;
      else if (cr >= 1.5) workingCapitalScore = 60;
      else if (cr >= 1.0) workingCapitalScore = 45;
      else if (cr >= 0.5) workingCapitalScore = 30;
      else workingCapitalScore = 15;
    }

    // Working capital degrading while revenue grows = quality concern
    if (financials.currentRatio !== null && financials.revenueGrowth !== null) {
      const cr = financials.currentRatio;
      const rg = financials.revenueGrowth;
      if (cr < 1.0 && rg > 0.10) {
        workingCapitalScore = Math.max(10, workingCapitalScore - 20);
      }
    }

    // ── Composite Accounting Quality Score ────────────────────────
    const compositeScore = weightedAverage([
      { score: cashConversionScore, weight: 3 },
      { score: accrualQualityScore, weight: 3 },
      { score: receivableRiskScore, weight: 2 },
      { score: workingCapitalScore, weight: 2 },
    ]);

    const commentary = this.generateCommentary(
      compositeScore,
      cashConversionScore,
      accrualQualityScore,
      receivableRiskScore,
      workingCapitalScore
    );

    return {
      score: compositeScore,
      cashConversionScore,
      accrualQualityScore,
      receivableRiskScore,
      workingCapitalScore,
      commentary,
    };
  }

  private generateCommentary(
    score: number,
    cashConv: number,
    accrual: number,
    receivable: number,
    workingCap: number
  ): string {
    if (score >= 75) {
      return 'High accounting quality. Strong cash conversion, low accruals, and healthy working capital suggest reported earnings are reliable.';
    }

    if (score >= 55) {
      const concerns: string[] = [];
      if (cashConv < 50) concerns.push('cash conversion below norms');
      if (accrual < 50) concerns.push('accrual divergence detected');
      return `Adequate accounting quality${concerns.length ? '. Note: ' + concerns.join(', ') : ''}.`;
    }

    if (score >= 35) {
      return 'Moderate accounting quality concerns. Earnings may not be fully backed by operating cash flows. Review footnotes.';
    }

    return 'Significant accounting quality concerns. Divergence between reported earnings and cash generation warrants careful scrutiny.';
  }
}

export const accountingEngine = new AccountingEngine();
