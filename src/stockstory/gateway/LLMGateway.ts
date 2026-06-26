import type { StockStoryResearchInput, StockStoryNarrativeOutput } from '../research/types';
import { researchOutputValidator } from '../validation/ResearchOutputValidator';
import { researchNarrativeService } from '../research/ResearchNarrativeService';
import { getLLMGatewayConfig, setLLMGatewayConfig, type LLMGatewayConfig, type LLMGatewayMode } from './config';
import { deterministicNarrativeProvider } from './providers/DeterministicNarrativeProvider';
import { mockLLMProvider } from './providers/MockLLMProvider';
import { disabledLLMProvider, getDisabledNarrative } from './providers/DisabledLLMProvider';
import { aiObservability } from '../observability/AiObservability';
import type {
  LLMProvider,
  ScannerQueryPlan,
  AlertExplanationInput,
  CompareSummaryInput,
  LLMTaskType,
} from './types';

export class LLMGateway {
  private providers: Map<LLMGatewayMode, LLMProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set('deterministic', deterministicNarrativeProvider);
    this.providers.set('mock', mockLLMProvider);
    this.providers.set('disabled', disabledLLMProvider);
  }

  getActiveProvider(): LLMProvider {
    const config = getLLMGatewayConfig();
    const provider = this.providers.get(config.mode);
    if (!provider) {
      return this.providers.get('deterministic')!;
    }
    return provider;
  }

  setMode(mode: LLMGatewayMode): void {
    setLLMGatewayConfig({ mode });
  }

  generateThesis(input: StockStoryResearchInput): StockStoryNarrativeOutput {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const config = getLLMGatewayConfig();

    let output: StockStoryNarrativeOutput;
    let fallbackUsed = false;
    let validationPassed = true;
    let schemaFailureReason: string | undefined;
    let policyFailureReason: string | undefined;

    try {
      output = provider.generateThesis(input);
    } catch {
      output = this.fallbackNarrative(input);
      fallbackUsed = true;
    }

    const validationResult = researchOutputValidator.validate(output);
    if (!validationResult.valid) {
      schemaFailureReason = validationResult.errors.join('; ');
      output = this.fallbackNarrative(input);
      fallbackUsed = true;
      validationPassed = false;
    }

    const latencyMs = Math.round(performance.now() - startTime);

    aiObservability.emit({
      taskType: 'generate_thesis',
      providerMode: config.mode,
      latencyMs,
      validationPassed,
      fallbackUsed,
      schemaFailureReason,
      policyFailureReason,
      inputTokenEstimate: undefined,
      outputTokenEstimate: undefined,
      costEstimate: config.mode === 'deterministic' ? 0 : null,
      timestamp: new Date().toISOString(),
    });

    return output;
  }

  parseScannerQuery(query: string): ScannerQueryPlan {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const config = getLLMGatewayConfig();

    let result: ScannerQueryPlan;
    try {
      result = provider.parseScannerQuery(query);
    } catch {
      result = {
        filters: [],
        sort: 'score',
        explanation: 'Scanner parsing failed. Use the manual filter panel instead.',
        unsupportedTerms: [query],
        confidence: 0,
      };
    }

    const latencyMs = Math.round(performance.now() - startTime);

    aiObservability.emit({
      taskType: 'parse_scanner_query',
      providerMode: config.mode,
      latencyMs,
      validationPassed: true,
      fallbackUsed: false,
      costEstimate: config.mode === 'deterministic' ? 0 : null,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  explainScoreChange(input: AlertExplanationInput): string {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const config = getLLMGatewayConfig();

    let result: string;
    try {
      result = provider.explainScoreChange(input);
    } catch {
      result = 'Score change explanation unavailable.';
    }

    const latencyMs = Math.round(performance.now() - startTime);

    aiObservability.emit({
      taskType: 'explain_score_change',
      providerMode: config.mode,
      latencyMs,
      validationPassed: true,
      fallbackUsed: false,
      costEstimate: config.mode === 'deterministic' ? 0 : null,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  generateAlertExplanation(input: AlertExplanationInput): string {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const config = getLLMGatewayConfig();

    let result: string;
    try {
      result = provider.generateAlertExplanation(input);
    } catch {
      result = 'Alert explanation unavailable.';
    }

    const latencyMs = Math.round(performance.now() - startTime);

    aiObservability.emit({
      taskType: 'generate_alert_explanation',
      providerMode: config.mode,
      latencyMs,
      validationPassed: true,
      fallbackUsed: false,
      costEstimate: config.mode === 'deterministic' ? 0 : null,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  generateCompareSummary(input: CompareSummaryInput): string {
    const startTime = performance.now();
    const provider = this.getActiveProvider();
    const config = getLLMGatewayConfig();

    let result: string;
    try {
      result = provider.generateCompareSummary(input);
    } catch {
      result = 'Comparison summary unavailable.';
    }

    const latencyMs = Math.round(performance.now() - startTime);

    aiObservability.emit({
      taskType: 'generate_compare_summary',
      providerMode: config.mode,
      latencyMs,
      validationPassed: true,
      fallbackUsed: false,
      costEstimate: config.mode === 'deterministic' ? 0 : null,
      timestamp: new Date().toISOString(),
    });

    return result;
  }

  private fallbackNarrative(input: StockStoryResearchInput): StockStoryNarrativeOutput {
    try {
      return researchNarrativeService.generateFullNarrative(input);
    } catch {
      return getDisabledNarrative();
    }
  }
}

export const llmGateway = new LLMGateway();
