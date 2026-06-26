import type { StockStoryResearchInput, StockStoryNarrativeOutput } from '../../research/types';
import type { LLMProvider, ScannerQueryPlan, ScannerFilter, AlertExplanationInput, CompareSummaryInput } from '../types';
import type { LLMGatewayMode } from '../config';

const FIXTURE_THESIS: StockStoryNarrativeOutput = {
  thesis: 'Mock thesis output for testing purposes. This is a deterministic fixture, not an LLM response.',
  bullCase: 'Mock bull case: The company shows potential in its addressable market.',
  bearCase: 'Mock bear case: Competitive pressures may impact market position.',
  whatChanged: 'Mock what changed: No recent changes detected in fixture mode.',
  whyItMatters: 'Mock context: This company operates in a relevant sector.',
  keyRisks: 'Mock risks: Standard market risks apply.',
  watchNext: 'Mock watch list: Monitor quarterly results and sector trends.',
  peerContextSummary: 'Mock peer context: Company is within expected sector parameters.',
  confidenceNote: 'Mock confidence: This is a test fixture.',
  methodologyNote: 'Mock methodology: This is a test-only implementation.',
  complianceSafeLabel: 'Mock label — Test Data',
};

export class MockLLMProvider implements LLMProvider {
  name = 'MockLLMProvider';
  mode: LLMGatewayMode = 'mock';

  generateThesis(_input: StockStoryResearchInput): StockStoryNarrativeOutput {
    return { ...FIXTURE_THESIS };
  }

  parseScannerQuery(_query: string): ScannerQueryPlan {
    return {
      filters: [],
      sort: 'score',
      explanation: 'Mock scanner parser — returns empty filter set.',
      unsupportedTerms: [_query],
      confidence: 0,
    };
  }

  explainScoreChange(_input: AlertExplanationInput): string {
    return 'Mock score change explanation. This is a test fixture.';
  }

  summarizeNewsContext(_input: { symbol: string; news: string[] }): string {
    return 'Mock news summary. This is a test fixture.';
  }

  generateAlertExplanation(_input: AlertExplanationInput): string {
    return 'Mock alert explanation. This is a test fixture.';
  }

  generateCompareSummary(_input: CompareSummaryInput): string {
    return 'Mock compare summary. This is a test fixture.';
  }
}

export const mockLLMProvider = new MockLLMProvider();
