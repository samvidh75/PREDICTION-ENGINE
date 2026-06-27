import type { AIProvider } from './AIProvider';
import { CachedAIProvider } from './CachedAIProvider';
import { ExternalLLMProvider } from './ExternalLLMProvider';
import { DeterministicResearchProvider } from './DeterministicResearchProvider';

let _instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (_instance) return _instance;

  const localAiEnabled = process.env.LOCAL_AI_ENABLED === 'true';
  const hasLocalUrl = !!(process.env.OLLAMA_URL || process.env.SGLANG_URL);

  if (localAiEnabled && hasLocalUrl) {
    const { LocalOllamaProvider } = require('./LocalOllamaProvider');
    _instance = new CachedAIProvider(new LocalOllamaProvider());
    console.log('[AI] Using LocalOllamaProvider (LOCAL_AI_ENABLED=true)');
  } else {
    const external = new ExternalLLMProvider();
    const hasKey = !!(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
    if (hasKey) {
      _instance = new CachedAIProvider(external);
      console.log('[AI] Using ExternalLLMProvider with caching');
    } else {
      _instance = new CachedAIProvider(new DeterministicResearchProvider());
      console.log('[AI] Using DeterministicResearchProvider (no LLM configured)');
    }
  }

  return _instance;
}

export { AIProvider } from './AIProvider';
export { CachedAIProvider } from './CachedAIProvider';
export { ExternalLLMProvider } from './ExternalLLMProvider';
export { DeterministicResearchProvider } from './DeterministicResearchProvider';
export type {
  StockData,
  StockAnalysis,
  AnalysisScore,
  Thesis,
  Recommendation,
  StockComparison,
  ThesisValidity,
} from './AIProvider';
