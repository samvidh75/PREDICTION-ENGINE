/**
 * Evidence-bound answer types
 */

export type ComplianceLabel = 'research_only' | 'limited_information' | 'needs_review';

export interface EvidenceBoundAnswer {
  answer: string;
  evidenceIds: string[];
  confidence: string;
  limitations: string[];
  unsupportedClaimsRemoved: string[];
  complianceLabel: ComplianceLabel;
}

export interface PublicEvidenceAnswer {
  answer: string;
  researchBasis: string;
  limitations: string[];
  confidence: string;
}
