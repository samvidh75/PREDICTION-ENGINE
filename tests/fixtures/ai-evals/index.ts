export interface EvalCase {
  id: string;
  taskType: string;
  input: Record<string, unknown>;
  expectedRequiredConcepts: string[];
  forbiddenConcepts: string[];
  expectedSchema: string;
  qualityRubric: string[];
  complianceRubric: string[];
}

import evalCases from './cases';

export function getAllEvalCases(): EvalCase[] {
  return evalCases;
}

export function getEvalCasesByTaskType(taskType: string): EvalCase[] {
  return evalCases.filter(c => c.taskType === taskType);
}
