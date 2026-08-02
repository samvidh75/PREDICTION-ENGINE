/**
 * EvidenceValidator
 *
 * Validates that claims are supported by evidence.
 * If a claim has no supporting evidence, its confidence is reduced or it is removed.
 * Missing evidence weakens claims rather than fabricating support.
 * Does not expose internal evidence sources to users.
 */

import type { ResearchEvidence, EvidenceBoundClaim } from './EvidenceTypes';

export interface ValidationWarning {
  claimIndex: number;
  claimPreview: string;
  warning: string;
}

export class EvidenceValidator {
  validateClaims(
    claims: EvidenceBoundClaim[],
    evidenceMap: Map<string, ResearchEvidence>,
  ): { valid: EvidenceBoundClaim[]; warnings: ValidationWarning[] } {
    const valid: EvidenceBoundClaim[] = [];
    const warnings: ValidationWarning[] = [];

    claims.forEach((claim, index) => {
      if (claim.evidenceIds.length === 0) {
        // Claim has no evidence — reduce confidence significantly
        const adjusted: EvidenceBoundClaim = {
          ...claim,
          confidence: Math.min(claim.confidence, 0.3),
        };
        valid.push(adjusted);
        warnings.push({
          claimIndex: index,
          claimPreview: claim.claim.slice(0, 80),
          warning: 'No evidence IDs provided — confidence reduced to 0.3',
        });
        return;
      }

      // Check all evidence IDs exist
      const missingIds = claim.evidenceIds.filter((id) => !evidenceMap.has(id));
      if (missingIds.length > 0) {
        // Partial evidence — reduce confidence proportionally
        const ratio = 1 - missingIds.length / claim.evidenceIds.length;
        const adjusted: EvidenceBoundClaim = {
          ...claim,
          confidence: Math.round(claim.confidence * ratio * 100) / 100,
        };
        valid.push(adjusted);
        warnings.push({
          claimIndex: index,
          claimPreview: claim.claim.slice(0, 80),
          warning: `Missing evidence: ${missingIds.join(', ')} — confidence reduced`,
        });
        return;
      }

      // Check evidence confidence
      const minEvidenceConfidence = Math.min(
        ...claim.evidenceIds.map((id) => evidenceMap.get(id)!.confidence),
      );

      if (minEvidenceConfidence < 0.5) {
        // Low-confidence evidence — reduce claim confidence
        const adjusted: EvidenceBoundClaim = {
          ...claim,
          confidence: Math.round(claim.confidence * minEvidenceConfidence * 100) / 100,
        };
        valid.push(adjusted);
        warnings.push({
          claimIndex: index,
          claimPreview: claim.claim.slice(0, 80),
          warning: 'Low-confidence evidence — claim confidence reduced',
        });
        return;
      }

      valid.push(claim);
    });

    return { valid, warnings };
  }

  buildEvidenceMap(evidence: ResearchEvidence[]): Map<string, ResearchEvidence> {
    const map = new Map<string, ResearchEvidence>();
    evidence.forEach((e) => map.set(e.id, e));
    return map;
  }
}
