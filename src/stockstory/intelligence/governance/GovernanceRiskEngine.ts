/**
 * Governance Risk Engine
 *
 * Evaluates corporate governance risk for Indian listed companies.
 * Key Indian governance indicators: promoter holding, pledged shares,
 * auditor changes, related-party transactions, board composition.
 *
 * All assessments are evidence-bound — no qualitative claims without data.
 */

import type { IntelligenceInput } from '../../types';
import { clampScore } from '../scoring';

export interface GovernanceRiskReport {
  symbol: string;
  generatedAt: string;

  /** Overall governance assessment */
  governanceScore: number;       // 0-100 (higher = better governance)
  riskLevel: 'low' | 'moderate' | 'elevated' | 'high' | 'insufficient_data';

  /** Sub-component scores */
  ownership: OwnershipGovernance;
  board: BoardGovernance;
  audit: AuditGovernance;
  transactions: RelatedPartyAssessment;

  /** Red flags requiring attention */
  redFlags: GovernanceRedFlag[];

  /** Summary for product display */
  summary: string;
  dataQuality: number;           // 0-1
}

export interface OwnershipGovernance {
  promoterHolding: number | null;
  institutionalHolding: number | null;
  pledgedShares: number | null;
  score: number;
  assessment: string;
}

export interface BoardGovernance {
  score: number;                 // Default: moderate unless data available
  assessment: string;
  dataAvailable: boolean;
}

export interface AuditGovernance {
  auditorChange: boolean;
  auditorQuality: 'high' | 'moderate' | 'unknown';
  score: number;
  assessment: string;
}

export interface RelatedPartyAssessment {
  relatedPartyTransactions: boolean;
  outstandingWarrants: boolean;
  score: number;
  assessment: string;
}

export interface GovernanceRedFlag {
  severity: 'critical' | 'high' | 'medium';
  category: 'promoter_pledge' | 'auditor_change' | 'related_party' | 'litigation' | 'board_quality' | 'esop';
  description: string;
  evidenceSource: string;
}

export class GovernanceRiskEngine {
  analyze(input: IntelligenceInput): GovernanceRiskReport {
    const r = input.risks;
    const f = input.financials;

    const ownership = this.assessOwnership(r);
    const board = this.assessBoard(r);
    const audit = this.assessAudit(r);
    const transactions = this.assessRelatedParty(r);

    const redFlags = this.collectRedFlags(r, f);
    const governanceScore = this.computeComposite(ownership, audit, transactions);
    const dataQuality = this.computeDataQuality(r);
    const summary = this.buildSummary(governanceScore, redFlags);

    return {
      symbol: input.symbol,
      generatedAt: new Date().toISOString(),
      governanceScore,
      riskLevel: governanceScore >= 70 ? 'low'
        : governanceScore >= 50 ? 'moderate'
        : governanceScore >= 30 ? 'elevated'
        : governanceScore > 0 ? 'high'
        : 'insufficient_data',
      ownership,
      board,
      audit,
      transactions,
      redFlags,
      summary,
      dataQuality,
    };
  }

  // ── Ownership governance ────────────────────────────────────

  private assessOwnership(r: IntelligenceInput['risks']): OwnershipGovernance {
    let score = 50;
    let assessment = '';

    const promoter = r?.promoterHolding ?? null;
    const institutional = r?.institutionalHolding ?? null;
    const pledged = r?.pledgedShares ?? null;

    // Promoter holding: moderate is best (30-55%), too high = governance risk
    if (promoter !== null) {
      if (promoter >= 30 && promoter <= 55) { score += 15; assessment += 'Promoter holding within reasonable range. '; }
      else if (promoter > 55) { score -= 10; assessment += 'High promoter holding may raise governance considerations. '; }
      else if (promoter < 20) { score += 5; assessment += 'Low promoter holding — widely held. '; }
    }

    // Institutional holding is positive for governance
    if (institutional !== null && institutional > 30) { score += 15; assessment += 'Strong institutional presence. '; }
    else if (institutional !== null && institutional > 10) { score += 5; assessment += 'Some institutional holding. '; }

    // Pledged shares are negative
    if (pledged !== null && pledged > 50) { score -= 25; assessment += 'Very high promoter pledge — significant governance risk. '; }
    else if (pledged !== null && pledged > 25) { score -= 15; assessment += 'High promoter pledge — monitor. '; }
    else if (pledged !== null && pledged > 10) { score -= 5; assessment += 'Moderate promoter pledge. '; }

    return {
      promoterHolding: promoter,
      institutionalHolding: institutional,
      pledgedShares: pledged,
      score: clampScore(score),
      assessment: assessment || 'Limited ownership data available.',
    };
  }

  // ── Board governance ────────────────────────────────────────

  private assessBoard(r: IntelligenceInput['risks']): BoardGovernance {
    // Board composition data is not available in current input
    // Default to moderate — acknowledge data gap
    return {
      score: 50,
      assessment: 'Board composition data is limited. Independent director ratio and board diversity should be researched independently.',
      dataAvailable: false,
    };
  }

  // ── Audit governance ────────────────────────────────────────

  private assessAudit(r: IntelligenceInput['risks']): AuditGovernance {
    let score = 60;
    let assessment = '';
    const auditorChange = r?.auditorChange ?? false;

    if (auditorChange) {
      score -= 25;
      assessment = 'Recent auditor change requires review — may indicate governance concerns.';
    } else {
      assessment = 'No recent auditor change detected — a positive governance indicator.';
    }

    return {
      auditorChange,
      auditorQuality: 'unknown', // External data needed
      score: clampScore(score),
      assessment,
    };
  }

  // ── Related party ───────────────────────────────────────────

  private assessRelatedParty(r: IntelligenceInput['risks']): RelatedPartyAssessment {
    let score = 60;
    let assessment = '';

    if (r?.relatedPartyTransactions) {
      score -= 20;
      assessment += 'Related-party transactions detected — review nature and volume. ';
    }
    if (r?.outstandingWarrants) {
      score -= 10;
      assessment += 'Outstanding warrants may dilute equity. ';
    }
    if (r?.esopDilution !== null && r.esopDilution > 5) {
      score -= 15;
      assessment += `ESOP dilution of ${r.esopDilution}% is above typical range. `;
    }

    return {
      relatedPartyTransactions: r?.relatedPartyTransactions ?? false,
      outstandingWarrants: r?.outstandingWarrants ?? false,
      score: clampScore(score),
      assessment: assessment || 'No significant related-party concerns identified.',
    };
  }

  // ── Red flags ───────────────────────────────────────────────

  private collectRedFlags(
    r: IntelligenceInput['risks'],
    f: IntelligenceInput['financials'],
  ): GovernanceRedFlag[] {
    const flags: GovernanceRedFlag[] = [];

    if (r?.pledgedShares !== null && r.pledgedShares > 50) {
      flags.push({
        severity: 'critical',
        category: 'promoter_pledge',
        description: `${r.pledgedShares}% of promoter shares pledged — indicates significant promoter leverage.`,
        evidenceSource: 'pledgedShares',
      });
    } else if (r?.pledgedShares !== null && r.pledgedShares > 25) {
      flags.push({
        severity: 'high',
        category: 'promoter_pledge',
        description: `${r.pledgedShares}% of promoter shares pledged — monitor for increase.`,
        evidenceSource: 'pledgedShares',
      });
    }

    if (r?.auditorChange) {
      flags.push({
        severity: 'high',
        category: 'auditor_change',
        description: 'Recent auditor change — review reasons and new auditor quality.',
        evidenceSource: 'auditorChange',
      });
    }

    if (r?.relatedPartyTransactions) {
      flags.push({
        severity: 'medium',
        category: 'related_party',
        description: 'Related-party transactions present — review for arm\'s length compliance.',
        evidenceSource: 'relatedPartyTransactions',
      });
    }

    if (r?.litigationRisk !== null && r.litigationRisk > 0.7) {
      flags.push({
        severity: 'high',
        category: 'litigation',
        description: 'Significant litigation exposure may affect operations and reputation.',
        evidenceSource: 'litigationRisk',
      });
    }

    if (r?.esopDilution !== null && r.esopDilution > 5) {
      flags.push({
        severity: 'medium',
        category: 'esop',
        description: `ESOP dilution of ${r.esopDilution}% — above typical Indian market levels.`,
        evidenceSource: 'esopDilution',
      });
    }

    return flags;
  }

  // ── Composite ──────────────────────────────────────────────

  private computeComposite(
    ownership: OwnershipGovernance,
    audit: AuditGovernance,
    transactions: RelatedPartyAssessment,
  ): number {
    return clampScore(Math.round(
      ownership.score * 0.40 +
      audit.score * 0.30 +
      transactions.score * 0.30
    ));
  }

  private computeDataQuality(r: IntelligenceInput['risks']): number {
    const fields = [
      r?.promoterHolding, r?.institutionalHolding, r?.pledgedShares,
      r?.governanceScore, r?.litigationRisk,
    ];
    const present = fields.filter(v => v !== null && v !== undefined).length;
    return fields.length > 0 ? Math.round((present / fields.length) * 100) / 100 : 0;
  }

  private buildSummary(score: number, flags: GovernanceRedFlag[]): string {
    if (score >= 70) return 'Governance profile appears sound based on available data. No significant red flags.';
    if (score >= 50) return 'Governance profile is adequate. Some indicators warrant monitoring.';
    if (score >= 30) return `Governance requires attention — ${flags.length} red flag(s) identified.`;
    return 'Governance data is insufficient for assessment. Independent due diligence recommended.';
  }
}

export const governanceRiskEngine = new GovernanceRiskEngine();
