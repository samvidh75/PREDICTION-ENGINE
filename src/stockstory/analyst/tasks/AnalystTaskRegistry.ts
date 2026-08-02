/**
 * AnalystTaskRegistry — validates and registers analyst task definitions.
 */

import {
  type AnalystTask,
  type AnalystTaskType,
  isValidTaskType,
  VALID_TRANSITIONS,
} from './AnalystTaskTypes';
import { containsSecrets } from '../shared/AnalystPublicSerializer';

export interface TaskValidationResult {
  valid: boolean;
  errors: string[];
}

export class AnalystTaskRegistry {
  validateCreate(input: {
    taskType: string;
    symbol?: string;
    sector?: string;
    priority?: string;
    input?: Record<string, unknown>;
  }): TaskValidationResult {
    const errors: string[] = [];

    if (!isValidTaskType(input.taskType)) {
      errors.push(`Invalid task type: ${input.taskType}`);
    }

    if (this.requiresSymbol(input.taskType as AnalystTaskType) && !input.symbol) {
      errors.push('Symbol is required for this task type.');
    }

    if (this.requiresSector(input.taskType as AnalystTaskType) && !input.sector) {
      errors.push('Sector is required for this task type.');
    }

    if (input.priority && !['low', 'medium', 'high', 'urgent'].includes(input.priority)) {
      errors.push('Invalid priority.');
    }

    if (input.input && containsSecrets(input.input)) {
      errors.push('Task input must not contain secrets.');
    }

    return { valid: errors.length === 0, errors };
  }

  validateTransition(current: AnalystTask['status'], next: AnalystTask['status']): boolean {
    return VALID_TRANSITIONS[current]?.includes(next) ?? false;
  }

  requiresSymbol(taskType: AnalystTaskType): boolean {
    return [
      'filing_review',
      'earnings_review',
      'company_deep_dive',
      'watchlist_review',
      'risk_review',
      'valuation_review',
      'peer_review',
      'scenario_review',
      'research_question_answer',
      'report_generation',
      'correction_review',
      'data_conflict_review',
    ].includes(taskType);
  }

  requiresSector(taskType: AnalystTaskType): boolean {
    return taskType === 'sector_brief';
  }
}

export const analystTaskRegistry = new AnalystTaskRegistry();
