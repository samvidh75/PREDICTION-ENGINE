/**
 * Evidence Types
 *
 * Every generated research claim must be linked to evidence where possible.
 * Missing evidence weakens or removes the claim.
 * No internal provider/API names exposed to users.
 */

export type EvidenceKind =
  | 'financial_metric'
  | 'technical_metric'
  | 'earnings_metric'
  | 'news_event'
  | 'sector_metric'
  | 'peer_metric'
  | 'rag_document'
  | 'factor_score'
  | 'previous_snapshot';

export type ClaimType =
  | 'thesis'
  | 'bull_case'
  | 'bear_case'
  | 'risk'
  | 'what_changed'
  | 'valuation'
  | 'earnings'
  | 'peer'
  | 'factor_explanation'
  | 'alert';

export interface ResearchEvidence {
  id: string;
  symbol: string;
  kind: EvidenceKind;
  label: string;
  value: string | number | null;
  asOf: string | null;
  confidence: number;
  internalSource?: string;
  publicLabel?: string;
}

export interface EvidenceBoundClaim {
  claim: string;
  evidenceIds: string[];
  confidence: number;
  claimType: ClaimType;
}

export interface EvidenceCollectionResult {
  evidence: ResearchEvidence[];
  claims: EvidenceBoundClaim[];
  overallConfidence: number;
  warnings: string[];
}

export function createEvidenceId(symbol: string, kind: EvidenceKind, index: number): string {
  return `${symbol}_${kind}_${index}`;
}
