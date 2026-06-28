/**
 * EvidenceCitationMapper
 */

import type { ResearchEvidence } from '../../intelligence/evidence/EvidenceTypes';

export class EvidenceCitationMapper {
  mapToResearchBasis(evidence: ResearchEvidence[]): string {
    if (evidence.length === 0) return 'Limited research basis available.';
    const kinds = [...new Set(evidence.map((e) => e.kind))];
    const labels = kinds.map((k) => k.replace(/_/g, ' '));
    return `Research basis: ${labels.join(', ')} (${evidence.length} evidence items).`;
  }

  extractIds(evidence: ResearchEvidence[]): string[] {
    return evidence.map((e) => e.id);
  }
}

export const evidenceCitationMapper = new EvidenceCitationMapper();
