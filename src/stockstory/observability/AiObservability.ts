import type { LLMGatewayTaskEvent, LLMTaskType } from '../gateway/types';
import type { LLMGatewayMode } from '../gateway/config';

interface AiObservabilityEvent {
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

interface AiObservabilityHandler {
  (event: AiObservabilityEvent): void;
}

export class AiObservability {
  private handlers: AiObservabilityHandler[] = [];
  private events: AiObservabilityEvent[] = [];
  private maxEvents: number = 10000;

  onEvent(handler: AiObservabilityHandler): void {
    this.handlers.push(handler);
  }

  emit(event: AiObservabilityEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch {
        // Silently handle handler errors
      }
    }
  }

  getEvents(options?: {
    taskType?: LLMTaskType;
    providerMode?: LLMGatewayMode;
    limit?: number;
    since?: string;
  }): AiObservabilityEvent[] {
    let filtered = [...this.events];

    if (options?.taskType) {
      filtered = filtered.filter(e => e.taskType === options.taskType);
    }
    if (options?.providerMode) {
      filtered = filtered.filter(e => e.providerMode === options.providerMode);
    }
    if (options?.since) {
      filtered = filtered.filter(e => e.timestamp >= options.since!);
    }

    if (options?.limit && options.limit < filtered.length) {
      filtered = filtered.slice(-options.limit);
    }

    return filtered;
  }

  getStats(): {
    totalEvents: number;
    byTaskType: Record<string, number>;
    byProviderMode: Record<string, number>;
    totalLatencyMs: number;
    avgLatencyMs: number;
    fallbackCount: number;
    validationFailureCount: number;
  } {
    const events = this.events;
    const byTaskType: Record<string, number> = {};
    const byProviderMode: Record<string, number> = {};
    let totalLatencyMs = 0;
    let fallbackCount = 0;
    let validationFailureCount = 0;

    for (const e of events) {
      byTaskType[e.taskType] = (byTaskType[e.taskType] || 0) + 1;
      byProviderMode[e.providerMode] = (byProviderMode[e.providerMode] || 0) + 1;
      totalLatencyMs += e.latencyMs;
      if (e.fallbackUsed) fallbackCount++;
      if (!e.validationPassed) validationFailureCount++;
    }

    return {
      totalEvents: events.length,
      byTaskType,
      byProviderMode,
      totalLatencyMs,
      avgLatencyMs: events.length > 0 ? Math.round(totalLatencyMs / events.length) : 0,
      fallbackCount,
      validationFailureCount,
    };
  }

  clear(): void {
    this.events = [];
  }
}

export const aiObservability = new AiObservability();
