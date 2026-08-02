/**
 * Risk Intelligence Engine
 *
 * Evaluates financial, valuation, volatility, and governance risks.
 * Higher score = riskier (inverted vs other engines).
 */

import type { IntelligenceInput, RiskEngineOutput } from '../types';
import { clampScore, confidenceWeight } from '../scoring';

export class RiskEngine {
  analyze(input: IntelligenceInput): RiskEngineOutput {
    const risk = input.risks;
    const fin = input.financials;

    const financialRisk = this.scoreFinancialRisk(fin);
    const valuationRisk = this.scoreValuationRisk(fin);
    const volatilityRisk = this.scoreVolatilityRisk(input.technicals);
    const governanceRisk = this.scoreGovernanceRisk(risk);

    const total = financialRisk + valuationRisk + volatilityRisk + governanceRisk;
    const normalised = clampScore(total);

    const redFlags = this.collectRedFlags(fin, risk, input.technicals);
    const requiredFields = [
      fin.debtToEquity, fin.currentRatio, fin.interestCoverage,
      risk?.governanceScore, risk?.pledgedShares,
    ];
    const dc = confidenceWeight(requiredFields, 5);
    const confidence = Math.min(0.99, dc);

    const reasoning = this.buildReasoning(normalised, financialRisk, valuationRisk, governanceRisk);

    return {
      score: normalised,
      financialRisk: clampScore(financialRisk),
      valuationRisk: clampScore(valuationRisk),
      volatilityRisk: clampScore(volatilityRisk),
      governanceRisk: clampScore(governanceRisk),
      redFlagCount: redFlags.length,
      redFlags,
      confidence: Math.round(confidence * 100) / 100,
      reasoning,
    };
  }

  // ── Financial risk (0–30) ───────────────────────────────────────

  private scoreFinancialRisk(fin: IntelligenceInput['financials']): number {
    let risk = 0;
    if (fin.debtToEquity !== null && fin.debtToEquity > 100) risk += 10;
    else if (fin.debtToEquity !== null && fin.debtToEquity > 50) risk += 5;

    if (fin.interestCoverage !== null && fin.interestCoverage < 1.5) risk += 10;
    else if (fin.interestCoverage !== null && fin.interestCoverage < 2.5) risk += 5;

    if (fin.currentRatio !== null && fin.currentRatio < 0.8) risk += 10;
    else if (fin.currentRatio !== null && fin.currentRatio < 1.2) risk += 5;

    return risk;
  }

  // ── Valuation risk (0–20) ───────────────────────────────────────

  private scoreValuationRisk(fin: IntelligenceInput['financials']): number {
    let risk = 0;
    if (fin.peRatio !== null && fin.peRatio > 50) risk += 10;
    else if (fin.peRatio !== null && fin.peRatio > 30) risk += 6;
    else if (fin.peRatio !== null && fin.peRatio > 20) risk += 3;

    if (fin.pbRatio !== null && fin.pbRatio > 10) risk += 5;
    else if (fin.pbRatio !== null && fin.pbRatio > 5) risk += 3;

    if (fin.evEbitda !== null && fin.evEbitda > 25) risk += 5;
    else if (fin.evEbitda !== null && fin.evEbitda > 15) risk += 3;

    return risk;
  }

  // ── Volatility risk (0–25) ──────────────────────────────────────

  private scoreVolatilityRisk(t: IntelligenceInput['technicals']): number {
    let risk = 0;
    if (t.volatility !== null) {
      if (t.volatility > 60) risk += 12;
      else if (t.volatility > 40) risk += 8;
      else if (t.volatility > 25) risk += 4;
    }

    if (t.beta !== null) {
      if (t.beta > 1.5) risk += 8;
      else if (t.beta > 1.2) risk += 4;
    }

    if (t.atr !== null) {
      // ATR relative to price — use bollinger width as proxy
      if (t.bollingerWidth !== null && t.bollingerWidth > 12) risk += 5;
    }

    return risk;
  }

  // ── Governance risk (0–25) ──────────────────────────────────────

  private scoreGovernanceRisk(risk: IntelligenceInput['risks']): number {
    let score = 0;
    if (risk?.auditorChange) score += 5;
    if (risk?.relatedPartyTransactions) score += 5;
    if (risk?.outstandingWarrants) score += 3;

    if (risk?.pledgedShares !== null && risk?.pledgedShares !== undefined && risk.pledgedShares > 50) score += 6;
    else if (risk?.pledgedShares !== null && risk?.pledgedShares !== undefined && risk.pledgedShares > 25) score += 3;

    if (risk?.governanceScore !== null && risk?.governanceScore !== undefined && risk.governanceScore < 30) score += 6;
    else if (risk?.governanceScore !== null && risk?.governanceScore !== undefined && risk.governanceScore < 50) score += 3;

    if (risk?.litigationRisk !== null && risk?.litigationRisk !== undefined && risk.litigationRisk > 0.5) score += 5;

    return score;
  }

  // ── Red flags ───────────────────────────────────────────────────

  private collectRedFlags(
    fin: IntelligenceInput['financials'],
    risk: IntelligenceInput['risks'],
    t: IntelligenceInput['technicals']
  ): string[] {
    const flags: string[] = [];
    if (fin.debtToEquity !== null && fin.debtToEquity > 100)
      flags.push('Debt-to-equity exceeds 100%');
    if (fin.interestCoverage !== null && fin.interestCoverage < 1.5)
      flags.push('Interest coverage below 1.5x');
    if (fin.currentRatio !== null && fin.currentRatio < 0.8)
      flags.push('Current ratio below 0.8');
    if (risk?.pledgedShares !== null && risk?.pledgedShares !== undefined && risk.pledgedShares > 50)
      flags.push(`Promoter pledge at ${risk.pledgedShares.toFixed(0)}%`);
    if (risk?.auditorChange)
      flags.push('Recent auditor change');
    if (risk?.relatedPartyTransactions)
      flags.push('Related-party transactions detected');
    if (risk?.litigationRisk !== null && risk?.litigationRisk !== undefined && risk.litigationRisk > 0.7)
      flags.push('Significant litigation exposure');
    if (t.volatility !== null && t.volatility > 60)
      flags.push('Extreme price volatility');
    return flags;
  }

  private buildReasoning(
    score: number,
    financial: number,
    valuation: number,
    governance: number
  ): string {
    if (score >= 65)
      return 'Elevated risk profile: multiple stress signals detected across financial, valuation, and governance dimensions.';
    if (score >= 40)
      return 'Moderate risk profile: some stress signals present but not系统性.';
    return 'Low risk profile: no significant red flags detected.';
  }
}

export const riskEngine = new RiskEngine();
