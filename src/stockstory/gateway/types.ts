import type { LensoryResearchInput, LensoryNarrativeOutput } from '../research/types';
import type { LLMGatewayMode } from './config';

export interface ScannerQueryPlan {
  filters: ScannerFilter[];
  sort: 'score' | 'momentum' | 'valuation' | 'growth' | 'quality' | 'risk' | 'name';
  preset?: string;
  explanation: string;
  unsupportedTerms: string[];
  confidence: number;
}

export interface ScannerFilter {
  field: string;
  operator: 'eq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'between';
  value: number | string | [number, number];
  label: string;
}

export interface AlertExplanationInput {
  symbol: string;
  changeType: string;
  oldValue?: number;
  newValue?: number;
  context: string;
}

export interface CompareSummaryInput {
  symbols: string[];
  scores: Record<string, number>;
  factorComparison: Record<string, Record<string, number>>;
}

export interface LLMGatewayTaskEvent {
  taskType: LLMTaskType;
  providerMode: LLMGatewayMode;
  latencyMs: number;
  validationPassed: boolean;
  fallbackUsed: boolean;
  schemaFailureReason?: string;
  policyFailureReason?: string;
  inputTokenEstimate?: number;
  outputTokenEstimate?: number;
  costEstimate: number | null;
  timestamp: string;
}

export type LLMTaskType =
  | 'generate_thesis'
  | 'parse_scanner_query'
  | 'explain_score_change'
  | 'summarize_news_context'
  | 'generate_alert_explanation'
  | 'generate_compare_summary';

export interface LLMProvider {
  name: string;
  mode: LLMGatewayMode;
  generateThesis(input: LensoryResearchInput): LensoryNarrativeOutput;
  parseScannerQuery(query: string): ScannerQueryPlan;
  explainScoreChange(input: AlertExplanationInput): string;
  summarizeNewsContext(input: { symbol: string; news: string[] }): string;
  generateAlertExplanation(input: AlertExplanationInput): string;
  generateCompareSummary(input: CompareSummaryInput): string;
}
