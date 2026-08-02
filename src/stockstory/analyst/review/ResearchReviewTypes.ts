/**
 * Research Review Types
 */

export type ReviewTrigger =
  | 'low_confidence'
  | 'high_materiality_filing'
  | 'governance_sensitive_claim'
  | 'unsupported_claim_removed'
  | 'data_conflict'
  | 'large_thesis_change'
  | 'severe_risk_escalation'
  | 'sensitive_question'
  | 'llm_validation_warning'
  | 'public_content_warning';

export type ReviewStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'revised'
  | 'auto_published'
  | 'not_publishable';

export interface ResearchReviewItem {
  id: string;
  outputId: string;
  symbol?: string;
  sector?: string;
  triggers: ReviewTrigger[];
  status: ReviewStatus;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
  reviewerNote?: string;
}
