/**
 * ResearchReviewPolicy
 */

import type { ReviewTrigger } from './ResearchReviewTypes';
import type { PublishDecision } from '../workflows/ResearchWorkflowTypes';

export class ResearchReviewPolicy {
  shouldQueueReview(params: {
    confidenceScore: number;
    triggers: ReviewTrigger[];
    publishDecision: PublishDecision;
  }): boolean {
    if (params.publishDecision === 'needs_review' || params.publishDecision === 'do_not_publish') {
      return true;
    }
    if (params.confidenceScore < 40) return true;
    if (params.triggers.includes('governance_sensitive_claim')) return true;
    if (params.triggers.includes('high_materiality_filing')) return true;
    return false;
  }

  isPublishable(status: string): boolean {
    return status === 'approved' || status === 'auto_published' || status === 'revised';
  }
}

export const researchReviewPolicy = new ResearchReviewPolicy();
