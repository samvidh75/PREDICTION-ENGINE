/**
 * Research Workflow Types
 */

import type { ResearchEvidence } from '../../intelligence/evidence/EvidenceTypes';

export type ResearchWorkflowType =
  | 'filing_to_thesis'
  | 'earnings_to_research'
  | 'company_deep_dive'
  | 'sector_weekly_brief'
  | 'watchlist_daily_review'
  | 'risk_event_review'
  | 'valuation_change_review'
  | 'peer_dislocation_review'
  | 'user_question_answer'
  | 'report_export';

export type PublishDecision =
  | 'auto_publish'
  | 'publish_with_limitations'
  | 'needs_review'
  | 'do_not_publish';

export interface EvidenceMap {
  evidence: ResearchEvidence[];
  byKind: Record<string, ResearchEvidence[]>;
  completeness: number;
}

export interface WorkflowContext {
  workflowId: string;
  workflowType: ResearchWorkflowType;
  symbol?: string;
  sector?: string;
  userId?: string;
  input: Record<string, unknown>;
  evidenceMap: EvidenceMap;
  limitations: string[];
  validationWarnings: string[];
  confidenceScore: number;
  publishDecision: PublishDecision;
  usedLlm: boolean;
}

export interface WorkflowResult<T = Record<string, unknown>> {
  ok: boolean;
  workflowId: string;
  workflowType: ResearchWorkflowType;
  output: T;
  publicOutput: Record<string, unknown>;
  confidenceScore: number;
  publishDecision: PublishDecision;
  limitations: string[];
  auditTrailId: string;
}
