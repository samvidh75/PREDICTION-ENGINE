// src/services/monitoring/metricsCollector.ts
// Lightweight in-memory request metrics for ops observability.

const metrics = {
  totalRequests: 0,
  rejected429: 0,
  activeRequests: 0,
  cacheHits: 0,
  cacheMisses: 0,
  providerCalls: {} as Record<string, { total: number; failed: number; lastSuccess: string | null }>,
  brokerConnections: {} as Record<string, number>,
  startTime: Date.now(),
};

export function trackRequest(): void {
  metrics.totalRequests++;
  metrics.activeRequests++;
}

export function trackResponse(statusCode: number): void {
  metrics.activeRequests--;
  if (statusCode === 429) metrics.rejected429++;
}

export function trackCacheHit(): void {
  metrics.cacheHits++;
}

export function trackCacheMiss(): void {
  metrics.cacheMisses++;
}

export function trackProviderCall(provider: string, success: boolean): void {
  if (!metrics.providerCalls[provider]) {
    metrics.providerCalls[provider] = { total: 0, failed: 0, lastSuccess: null };
  }
  metrics.providerCalls[provider].total++;
  if (!success) metrics.providerCalls[provider].failed++;
  else metrics.providerCalls[provider].lastSuccess = new Date().toISOString();
}

export function trackBrokerConnection(broker: string, delta: 1 | -1): void {
  metrics.brokerConnections[broker] = (metrics.brokerConnections[broker] || 0) + delta;
}

export function getMetrics() {
  const elapsed = (Date.now() - metrics.startTime) / 1000;
  const hitRate = metrics.totalRequests > 0
    ? metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
    : 0;

  return {
    uptime_seconds: Math.floor(elapsed),
    total_requests: metrics.totalRequests,
    active_requests: metrics.activeRequests,
    rejected_429: metrics.rejected429,
    rejection_rate: metrics.totalRequests > 0
      ? metrics.rejected429 / metrics.totalRequests
      : 0,
    cache_hit_rate: hitRate,
    cache_hits: metrics.cacheHits,
    cache_misses: metrics.cacheMisses,
    providers: metrics.providerCalls,
    broker_counts: metrics.brokerConnections,
  };
}
