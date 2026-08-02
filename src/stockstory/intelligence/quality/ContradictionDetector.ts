/**
 * Contradiction Detector
 * Phase 10-11 — Cross-checks investment theses against risk assessments,
 * detects self-contradictory claims in research output.
 */
import type { ValidationIssue, ConsistencyCheck } from '../validation/IntelligenceValidationTypes';

interface ThesisClaim {
  id: string;
  type: 'bullish' | 'bearish' | 'neutral';
  factor: string;
  text: string;
  score: number;
  confidence: number;
}

interface RiskClaim {
  id: string;
  type: 'financial' | 'operational' | 'governance' | 'regulatory' | 'valuation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  text: string;
}

interface ContradictionResult {
  contradictions: Array<{
    thesisClaim: ThesisClaim;
    riskClaim: RiskClaim;
    reason: string;
    severity: 'error' | 'warning';
  }>;
  totalClaims: number;
  totalRisks: number;
  contradictionCount: number;
  passed: boolean;
}

const CONTRADICTION_MAP: Record<string, string[]> = {
  bullish_growth: ['financial.stagnation', 'financial.decliningRevenue'],
  bullish_quality: ['operational.inputCostRising', 'governance.relatedPartyTransactions'],
  bullish_valuation: ['valuation.expensive', 'valuation.peAboveIndustry'],
  bullish_moat: ['operational.increasingCompetition', 'regulatory.deregulationRisk'],
  bullish_momentum: ['financial.debtRising', 'valuation.overbought'],
  bullish_dividend: ['financial.cashFlowDeteriorating', 'financial.highPayoutRatio'],
  bearish_risk: ['financial.strongBalanceSheet', 'valuation.deepValue'],
};

export class ContradictionDetector {
  /**
   * Run contradiction detection between thesis claims and risk assessments.
   */
  detect(thesis: ThesisClaim[], risks: RiskClaim[]): ContradictionResult {
    const contradictions: ContradictionResult['contradictions'] = [];

    for (const claim of thesis) {
      for (const risk of risks) {
        const reason = this.checkContradiction(claim, risk);
        if (reason) {
          contradictions.push({
            thesisClaim: claim,
            riskClaim: risk,
            reason,
            severity: claim.confidence > 0.7 ? 'error' : 'warning',
          });
        }
      }
    }

    return {
      contradictions,
      totalClaims: thesis.length,
      totalRisks: risks.length,
      contradictionCount: contradictions.length,
      passed: contradictions.filter(c => c.severity === 'error').length === 0,
    };
  }

  private checkContradiction(claim: ThesisClaim, risk: RiskClaim): string | null {
    const key = `${claim.type}_${claim.factor}`;
    const riskKey = `${risk.type}.${risk.severity === 'critical' || risk.severity === 'high' ? 'critical' : 'moderate'}`;
    const patterns = CONTRADICTION_MAP[key];

    if (patterns && patterns.some(p => risk.text.toLowerCase().includes(p.split('.').pop()?.toLowerCase() || ''))) {
      return `Thesis claims "${claim.text}" but risk flags "${risk.text}"`;
    }

    return null;
  }

  /**
   * Convert to consistency checks for the validation framework.
   */
  toConsistencyChecks(result: ContradictionResult, symbol: string): ConsistencyCheck[] {
    return result.contradictions.map((c, i) => ({
      id: `contradiction-${symbol}-${i}`,
      type: 'thesis_vs_risk' as const,
      passed: c.severity !== 'error',
      explanation: c.reason,
    }));
  }

  /**
   * Convert to validation issues.
   */
  toIssues(result: ContradictionResult, symbol: string): ValidationIssue[] {
    return result.contradictions.map((c, i) => ({
      id: `contra-${symbol}-${i}-${c.thesisClaim.id}`,
      severity: c.severity,
      module: 'contradiction-detector',
      symbol,
      reason: c.reason,
      recommendedFix: 'Resolve contradiction: either adjust thesis claim or acknowledge risk with mitigation context',
      detectedAt: new Date().toISOString(),
    }));
  }
}

export type { ThesisClaim, RiskClaim, ContradictionResult };
