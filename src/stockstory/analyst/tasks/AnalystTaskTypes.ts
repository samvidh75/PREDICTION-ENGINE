/**
 * Analyst Task Types
 */

export type AnalystTaskType =
  | 'filing_review'
  | 'earnings_review'
  | 'company_deep_dive'
  | 'sector_brief'
  | 'watchlist_review'
  | 'risk_review'
  | 'valuation_review'
  | 'peer_review'
  | 'scenario_review'
  | 'research_question_answer'
  | 'report_generation'
  | 'correction_review'
  | 'data_conflict_review';

export type AnalystTaskStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'completed_with_limitations'
  | 'needs_human_review'
  | 'failed_safely'
  | 'cancelled';

export type AnalystTaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface AnalystTask {
  id: string;
  taskType: AnalystTaskType;
  symbol?: string;
  sector?: string;
  userId?: string;
  priority: AnalystTaskPriority;
  status: AnalystTaskStatus;
  input: Record<string, unknown>;
  outputId?: string | null;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export const VALID_TASK_TYPES: AnalystTaskType[] = [
  'filing_review',
  'earnings_review',
  'company_deep_dive',
  'sector_brief',
  'watchlist_review',
  'risk_review',
  'valuation_review',
  'peer_review',
  'scenario_review',
  'research_question_answer',
  'report_generation',
  'correction_review',
  'data_conflict_review',
];

export const VALID_TRANSITIONS: Record<AnalystTaskStatus, AnalystTaskStatus[]> = {
  queued: ['running', 'cancelled'],
  running: ['completed', 'completed_with_limitations', 'needs_human_review', 'failed_safely', 'cancelled'],
  completed: [],
  completed_with_limitations: [],
  needs_human_review: ['completed', 'completed_with_limitations', 'failed_safely'],
  failed_safely: [],
  cancelled: [],
};

export function isValidTaskType(type: string): type is AnalystTaskType {
  return VALID_TASK_TYPES.includes(type as AnalystTaskType);
}
