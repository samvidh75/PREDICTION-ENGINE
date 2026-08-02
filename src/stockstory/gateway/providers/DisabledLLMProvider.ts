import type { LensoryResearchInput, LensoryNarrativeOutput } from '../../research/types';
import { researchNarrativeService } from '../../research/ResearchNarrativeService';
import type { LLMProvider, ScannerQueryPlan, AlertExplanationInput, CompareSummaryInput } from '../types';
import type { LLMGatewayMode } from '../config';

const DISABLED_NARRATIVE: LensoryNarrativeOutput = {
  thesis: 'Research narrative generation is not available at this time.',
  bullCase: 'Detailed analysis is currently unavailable.',
  bearCase: 'Detailed analysis is currently unavailable.',
  whatChanged: 'Change tracking is not available.',
  whyItMatters: 'Context analysis is not available.',
  keyRisks: 'Risk analysis requires additional data.',
  watchNext: 'Monitoring recommendations require full system availability.',
  peerContextSummary: 'Peer analysis is not available.',
  confidenceNote: 'This assessment is limited by system configuration.',
  methodologyNote: 'Research methodology is part of Lensory\'s deterministic analytical engine.',
  complianceSafeLabel: 'Research — Data Pending',
};

export class DisabledLLMProvider implements LLMProvider {
  name = 'DisabledLLMProvider';
  mode: LLMGatewayMode = 'disabled';

  generateThesis(_input: LensoryResearchInput): LensoryNarrativeOutput {
    return { ...DISABLED_NARRATIVE };
  }

  parseScannerQuery(_query: string): ScannerQueryPlan {
    return {
      filters: [],
      sort: 'score',
      explanation: 'Natural language scanner parsing is not available. Use the filter panel to refine your search.',
      unsupportedTerms: [_query],
      confidence: 0,
    };
  }

  explainScoreChange(_input: AlertExplanationInput): string {
    return 'Score change explanation is not available in the current configuration.';
  }

  summarizeNewsContext(_input: { symbol: string; news: string[] }): string {
    return 'News summarization is not available. Review individual articles for context.';
  }

  generateAlertExplanation(_input: AlertExplanationInput): string {
    return 'Alert explanation is not available in the current configuration.';
  }

  generateCompareSummary(_input: CompareSummaryInput): string {
    return 'Comparison summary is not available. Review the factor-by-factor breakdown for details.';
  }
}

export const disabledLLMProvider = new DisabledLLMProvider();

export function getDisabledNarrative(): LensoryNarrativeOutput {
  return { ...DISABLED_NARRATIVE };
}
