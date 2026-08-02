/**
 * AnalystEscalationEngine
 */

import type { PublishDecision } from '../workflows/ResearchWorkflowTypes';

export interface EscalationInput {
  confidenceScore: number;
  validationPassed: boolean;
  governanceSensitive: boolean;
  unsupportedClaimsRemoved: number;
  materiality: 'low' | 'medium' | 'high';
}

export interface EscalationOutput {
  decision: PublishDecision;
  publicLimitation?: string;
}

export class AnalystEscalationEngine {
  decide(input: EscalationInput): PublishDecision {
    return this.evaluate(input).decision;
  }

  evaluate(input: EscalationInput): EscalationOutput {
    if (input.unsupportedClaimsRemoved > 2 || !input.validationPassed) {
      return {
        decision: 'do_not_publish',
        publicLimitation: 'This research output could not be published safely.',
      };
    }

    if (input.governanceSensitive && input.confidenceScore < 60) {
      return {
        decision: 'needs_review',
        publicLimitation: 'Governance-related content needs review before full publication.',
      };
    }

    if (input.confidenceScore < 30) {
      return {
        decision: 'needs_review',
        publicLimitation: 'Limited confidence — review recommended.',
      };
    }

    if (input.confidenceScore < 55 || input.materiality === 'high') {
      return {
        decision: 'publish_with_limitations',
        publicLimitation: 'Published with limitations due to partial data availability.',
      };
    }

    return { decision: 'auto_publish' };
  }
}
