// src/services/audit/DataFlowTracer.ts
// Records provider usage for cost tracking and debugging.

export interface TraceEntry {
  symbol: string;
  category: string;  // price, metadata, history, news, financials
  provider: string;  // constructor name
  failed: boolean;
  timestamp: string;
}

export class DataFlowTracer {
  private log: TraceEntry[] = [];

  recordUsage(symbol: string, category: string, provider: string, failed: boolean): void {
    this.log.push({
      symbol,
      category,
      provider,
      failed,
      timestamp: new Date().toISOString(),
    });
  }

  getLog(): TraceEntry[] {
    return [...this.log];
  }

  clear(): void {
    this.log = [];
  }
}
