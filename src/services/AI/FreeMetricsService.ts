import promClient from 'prom-client';

const register = promClient.register;

export class FreeMetricsService {
  private llmCalls: promClient.Counter<string>;
  private llmLatency: promClient.Histogram<string>;
  private vectorSearches: promClient.Counter<string>;

  constructor() {
    this.llmCalls = new promClient.Counter({
      name: 'llm_calls_total',
      help: 'Total LLM calls',
      labelNames: ['model', 'status'],
      registers: [register],
    });

    this.llmLatency = new promClient.Histogram({
      name: 'llm_latency_seconds',
      help: 'LLM request latency',
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [register],
    });

    this.vectorSearches = new promClient.Counter({
      name: 'vector_searches_total',
      help: 'Total vector searches',
      labelNames: ['collection'],
      registers: [register],
    });
  }

  trackLLMCall(model: string, latencyMs: number, success: boolean): void {
    this.llmCalls.inc({ model, status: success ? 'success' : 'error' });
    this.llmLatency.observe(latencyMs / 1000);
  }

  trackVectorSearch(collection: string): void {
    this.vectorSearches.inc({ collection });
  }

  getMetrics(): Promise<string> {
    return register.metrics();
  }

  getContentType(): string {
    return register.contentType;
  }
}

export const freeMetricsService = new FreeMetricsService();
