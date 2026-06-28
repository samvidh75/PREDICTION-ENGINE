/**
 * Financial Risk Scoring — 0-20 points
 * Measures balance sheet strength: D/E, current ratio, interest coverage, cash reserves
 * Higher sub-scores = LOWER risk (stronger financials)
 */
import type { RiskMetrics } from '../../types';
import logger from '../../../../config/logger';

export interface FinancialRiskResult {
  leverageScore: number;
  liquidityScore: number;
  coverageScore: number;
  cashScore: number;
  points: number;            // 0-20
  reasoning: string;
}

export function scoreFinancialRisk(metrics: RiskMetrics): FinancialRiskResult {
  let leverageScore = 0;
  let liquidityScore = 0;
  let coverageScore = 0;
  let cashScore = 0;
  const reasons: string[] = [];

  // ---- DEBT TO EQUITY (0-8 pts) ----
  if (metrics.debtToEquity !== undefined) {
    const de = metrics.debtToEquity;
    if (de < 0.3) {
      leverageScore = 8;
      reasons.push(`Minimal leverage (D/E=${de.toFixed(2)}) — very safe`);
    } else if (de < 0.5) {
      leverageScore = 7;
      reasons.push(`Low leverage (D/E=${de.toFixed(2)}) — conservative`);
    } else if (de < 0.8) {
      leverageScore = 5;
      reasons.push(`Moderate leverage (D/E=${de.toFixed(2)}) — manageable`);
    } else if (de < 1.2) {
      leverageScore = 3;
      reasons.push(`Elevated leverage (D/E=${de.toFixed(2)}) — some concern`);
    } else if (de < 2.0) {
      leverageScore = 1;
      reasons.push(`High leverage (D/E=${de.toFixed(2)}) — risky`);
    } else {
      leverageScore = 0;
      reasons.push(`Excessive leverage (D/E=${de.toFixed(2)}) — highly leveraged`);
    }
  } else {
    leverageScore = 2;
    reasons.push('D/E data not available; defaulting');
  }

  // ---- CURRENT RATIO (0-4 pts) ----
  if (metrics.currentRatio !== undefined) {
    const cr = metrics.currentRatio;
    if (cr > 2.0) {
      liquidityScore = 4;
      reasons.push(`Strong liquidity (CR=${cr.toFixed(2)}) — ample buffer`);
    } else if (cr > 1.5) {
      liquidityScore = 3;
      reasons.push(`Adequate liquidity (CR=${cr.toFixed(2)})`);
    } else if (cr > 1.0) {
      liquidityScore = 2;
      reasons.push(`Marginal liquidity (CR=${cr.toFixed(2)}) — tight`);
    } else if (cr > 0.8) {
      liquidityScore = 1;
      reasons.push(`Strained liquidity (CR=${cr.toFixed(2)}) — stress indicator`);
    } else {
      liquidityScore = 0;
      reasons.push(`Poor liquidity (CR=${cr.toFixed(2)}) — liquidity risk`);
    }
  } else {
    liquidityScore = 1;
    reasons.push('Current ratio data not available');
  }

  // ---- INTEREST COVERAGE (0-4 pts) ----
  if (metrics.interestCoverage !== undefined) {
    const ic = metrics.interestCoverage;
    if (ic > 8) {
      coverageScore = 4;
      reasons.push(`Excellent interest coverage (${ic.toFixed(1)}x) — very comfortable`);
    } else if (ic > 4) {
      coverageScore = 3;
      reasons.push(`Good interest coverage (${ic.toFixed(1)}x)`);
    } else if (ic > 2) {
      coverageScore = 2;
      reasons.push(`Adequate interest coverage (${ic.toFixed(1)}x) — just enough`);
    } else if (ic > 1) {
      coverageScore = 1;
      reasons.push(`Minimal interest coverage (${ic.toFixed(1)}x) — barely covering`);
    } else {
      coverageScore = 0;
      reasons.push(`Inadequate interest coverage (${ic.toFixed(1)}x) — debt servicing stress`);
    }
  } else {
    coverageScore = 1;
    reasons.push('Interest coverage not available');
  }

  // ---- CASH RESERVES - months (0-4 pts) ----
  if (metrics.cashReserves !== undefined) {
    const cash = metrics.cashReserves;
    if (cash > 12) {
      cashScore = 4;
      reasons.push(`Large cash buffer (${cash.toFixed(0)} months) — highly resilient`);
    } else if (cash > 6) {
      cashScore = 3;
      reasons.push(`Comfortable cash reserves (${cash.toFixed(0)} months)`);
    } else if (cash > 3) {
      cashScore = 2;
      reasons.push(`Modest cash reserves (${cash.toFixed(0)} months)`);
    } else if (cash > 1) {
      cashScore = 1;
      reasons.push(`Low cash reserves (${cash.toFixed(0)} months) — vulnerable`);
    } else {
      cashScore = 0;
      reasons.push(`Critically low cash (${cash.toFixed(1)} months) — cash crunch risk`);
    }
  } else {
    cashScore = 1;
    reasons.push('Cash reserve data not available');
  }

  const total = leverageScore + liquidityScore + coverageScore + cashScore;

  logger.debug({
    leverageScore, liquidityScore, coverageScore, cashScore,
    total, symbol: metrics.symbol,
  }, 'Financial Risk scored');

  return {
    leverageScore,
    liquidityScore,
    coverageScore,
    cashScore,
    points: total,
    reasoning: reasons.join('. '),
  };
}
