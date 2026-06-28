/**
 * ResearchWorkflowPlanner — plans workflow steps from task type and input.
 */

import type { ResearchWorkflowType } from './ResearchWorkflowTypes';
import type { AnalystTaskType } from '../tasks/AnalystTaskTypes';

export interface WorkflowPlan {
  workflowType: ResearchWorkflowType;
  steps: string[];
  requiresDocuments: boolean;
  requiresMetrics: boolean;
  optionalLlm: boolean;
}

const TASK_TO_WORKFLOW: Partial<Record<AnalystTaskType, ResearchWorkflowType>> = {
  filing_review: 'filing_to_thesis',
  earnings_review: 'earnings_to_research',
  company_deep_dive: 'company_deep_dive',
  sector_brief: 'sector_weekly_brief',
  watchlist_review: 'watchlist_daily_review',
  risk_review: 'risk_event_review',
  valuation_review: 'valuation_change_review',
  peer_review: 'peer_dislocation_review',
  research_question_answer: 'user_question_answer',
  report_generation: 'report_export',
};

export class ResearchWorkflowPlanner {
  planFromTask(taskType: AnalystTaskType): WorkflowPlan {
    const workflowType = TASK_TO_WORKFLOW[taskType] ?? 'company_deep_dive';
    return this.plan(workflowType);
  }

  plan(workflowType: ResearchWorkflowType): WorkflowPlan {
    const baseSteps = [
      'load_context',
      'load_metrics',
      'load_documents',
      'load_memory',
      'build_evidence_map',
      'run_intelligence',
      'generate_draft',
      'validate_claims',
      'score_confidence',
      'decide_publish',
      'store_audit',
    ];

    switch (workflowType) {
      case 'filing_to_thesis':
        return { workflowType, steps: baseSteps, requiresDocuments: true, requiresMetrics: true, optionalLlm: true };
      case 'earnings_to_research':
        return { workflowType, steps: baseSteps, requiresDocuments: false, requiresMetrics: true, optionalLlm: true };
      case 'sector_weekly_brief':
        return { workflowType, steps: baseSteps, requiresDocuments: false, requiresMetrics: true, optionalLlm: false };
      case 'user_question_answer':
        return { workflowType, steps: [...baseSteps, 'classify_question'], requiresDocuments: true, requiresMetrics: true, optionalLlm: true };
      default:
        return { workflowType, steps: baseSteps, requiresDocuments: false, requiresMetrics: true, optionalLlm: false };
    }
  }
}

export const researchWorkflowPlanner = new ResearchWorkflowPlanner();
