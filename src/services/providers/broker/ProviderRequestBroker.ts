/**
 * F3.1A — ProviderRequestBroker
 *
 * Single outbound data-access boundary for all provider HTTP requests.
 *
 * Required behavior:
 *   1. Normalized request keys with secret stripping
 *   2. Single-flight coalescing: concurrent identical requests share one promise
 *   3. Provider quota enforcement (per-minute, per-day, burst, concurrent)
 *   4. Error classification (retry vs. non-retryable)
 *   5. Secret redaction from logs, ledgers, and error messages
 *   6. Cache integration with stale-while-revalidate
 *   7. Sanitized call ledger per upstream request
 *   8. Capped exponential backoff with jitter for retries
 *
 * Usage:
 *   const result = await broker.execute('psxapi', 'quote', 'RELIANCE', {
 *     token: 'secret'  // ← stripped from key, not logged
 *   }, async () => {
 *     return await fetch('https://api.example.com/...');
 *   });
 */

import type { ProviderOperation, BrokerResult, StatusClass, CacheState, BrokerExecuteOptions, CachePolicy } from './types';
import { buildRequestKey, serializeRequestKey, requestKeyHash } from './ProviderRequestKey';
import { ProviderQuotaPolicy } from './ProviderQuotaPolicy';
import { ProviderCallLedger, callLedger } from './ProviderCallLedger';
import { InMemoryProviderBrokerStore } from './InMemoryProviderBrokerStore';
import type { ProviderBrokerStore } from './ProviderBrokerStore';
import { classifyHttpStatus, classifyNetworkError, parseRetryAfter } from './ProviderErrorClassifier';
import { errUnknown } from './ProviderBrokerErrors';

/** Backoff config for retries. */
const BACKOFF_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10_000,
};

export class ProviderRequestBroker {
  constructor(
    private quota: ProviderQuotaPolicy = new ProviderQuotaPolicy(),
    private ledger: ProviderCallLedger = callLedger,
    private store: ProviderBrokerStore = new InMemoryProviderBrokerStore(),
  ) {}

  /**
   * Execute a provider request through the broker.
   *
   * @param provider  - Provider name (e.g. 'psxapi', 'yahoo')
   * @param operation - Operation type
   * @param symbol    - Symbol to fetch
   * @param params    - Parameters (secrets stripped before hashing)
   * @param fetcher   - Async function that performs the actual HTTP request.
   *                    Receives sanitized metadata (no secrets).
   * @returns BrokerResult with typed data.
   */
  async execute<T>(
    provider: string,
    operation: ProviderOperation,
    symbol: string,
    params: Record<string, unknown> | undefined,
    fetcher: (meta: { provider: string; operation: ProviderOperation; symbol: string; attempt: number }) => Promise<{ data: T; status: number; headers?: Record<string, string>; sourceAsOf?: string }>,
    options: BrokerExecuteOptions = {},
  ): Promise<BrokerResult<T>> {
    const startTime = Date.now();
    const key = buildRequestKey(provider, operation, symbol, params);
    const cacheKey = serializeRequestKey(key);
    const keyHash = requestKeyHash(key);

    // 1. Check negative cache
    if (this.store.isNegativelyCached(cacheKey)) {
      return this.makeResult<T>(provider, operation, symbol, startTime, null, 'error', 'negative', false, 0, {
        code: 'NEGATIVE_CACHED',
        message: 'Previously unavailable — cached negative result',
        category: 'unknown',
        retryable: false,
      }, options.runId);
    }

    // 2. Check fresh cache
    const freshHit = this.store.getFresh<BrokerResult<T>>(cacheKey);
    if (freshHit) {
      return this.makeResult<T>(provider, operation, symbol, startTime, freshHit.data.data, 'success', 'fresh', false, 0, null, options.runId);
    }

    // 3. Check stale cache for stale-while-revalidate
    const staleHit = this.store.getStale<BrokerResult<T>>(cacheKey);
    if (staleHit) {
      // Trigger async revalidation, return stale data immediately
      this.revalidateAsync(keyHash, cacheKey, provider, operation, symbol, params, fetcher, options);
      return this.makeResult<T>(provider, operation, symbol, startTime, staleHit.data.data, 'success', 'stale', false, 0, null, options.runId);
    }

    // 4. Single-flight: coalesce concurrent identical requests
    const { promise, isLeader } = this.store.getOrCreateInFlight<T>(cacheKey, async () => {
      return this.executeUpstream<T>(provider, operation, symbol, params, fetcher, keyHash, cacheKey, 'miss', options);
    });

    if (!isLeader) {
      // Follower — wait for leader's result, record as coalesced
      const result = await promise;
      return {
        ...result,
        coalesced: true,
        latencyMs: Date.now() - startTime,
      };
    }

    return promise;
  }

  /**
   * Execute the actual upstream request with retry logic.
   */
  private async executeUpstream<T>(
    provider: string,
    operation: ProviderOperation,
    symbol: string,
    params: Record<string, unknown> | undefined,
    fetcher: (meta: { provider: string; operation: ProviderOperation; symbol: string; attempt: number }) => Promise<{ data: T; status: number; headers?: Record<string, string>; sourceAsOf?: string }>,
    keyHash: string,
    cacheKey: string,
    ledgerCacheState: CacheState,
    options: BrokerExecuteOptions,
  ): Promise<BrokerResult<T>> {
    const startTime = Date.now();
    let lastError: BrokerResult<T> | null = null;
    let sourceAsOf: string | null = null;

    for (let attempt = 1; attempt <= BACKOFF_CONFIG.maxRetries; attempt++) {
      let callStarted = false;
      try {
        // Check quota before each attempt
        this.quota.checkQuota(provider);
        this.quota.recordCallStart(provider);
        callStarted = true;

        const response = await fetcher({ provider, operation, symbol, attempt });
        sourceAsOf = response.sourceAsOf ?? null;

        const retryAfterMs = parseRetryAfter(this.headerValue(response.headers, 'retry-after'));
        this.quota.recordCallEnd(provider, response.status, retryAfterMs);
        callStarted = false;

        if (response.status >= 200 && response.status < 300) {
          // Success
          const result = this.makeResult<T>(provider, operation, symbol, startTime, response.data, 'success', 'miss', false, attempt, null, options.runId);

          // Cache the successful result
          const ttl = this.cacheTtlFor(operation, options.cachePolicy);
          this.store.setFresh(cacheKey, result, ttl.ttlMs, ttl.staleWindowMs);

          // Record ledger entry
          this.ledger.record({
            runId: options.runId, provider, operation, symbol, requestKeyHash: keyHash,
            cacheState: ledgerCacheState, coalescedFollowerCount: this.coalescedFollowerCount(cacheKey),
            actualUpstreamCalls: 1, attemptCount: attempt,
            statusClass: 'success', errorCategory: null,
            latencyMs: Date.now() - startTime,
            quotaRemaining: this.quota.getRunLevelRemaining(),
            cooldownUntil: this.cooldownUntil(provider),
            sourceAsOf, retrievedAt: new Date().toISOString(),
          });

          return result;
        }

        // Error response
        const error = classifyHttpStatus(response.status, `HTTP ${response.status}`, retryAfterMs);

        // Non-retryable
        if (!error.retryable) {
          const statusClass = this.statusClassForError(error);
          const result = this.makeResult<T>(provider, operation, symbol, startTime, null, statusClass, 'miss', false, attempt, error, options.runId);

          this.ledger.record({
            runId: options.runId, provider, operation, symbol, requestKeyHash: keyHash,
            cacheState: ledgerCacheState, coalescedFollowerCount: this.coalescedFollowerCount(cacheKey),
            actualUpstreamCalls: 1, attemptCount: attempt,
            statusClass, errorCategory: error.category,
            latencyMs: Date.now() - startTime,
            quotaRemaining: this.quota.getRunLevelRemaining(),
            cooldownUntil: this.cooldownUntil(provider),
            sourceAsOf, retrievedAt: new Date().toISOString(),
          });

          // Negative cache unavailable upstream responses briefly.
          this.store.setNegative(cacheKey, this.cacheTtlFor(operation, options.cachePolicy).negativeTtlMs);
          return result;
        }

        // Retryable error — apply backoff
        lastError = this.makeResult<T>(provider, operation, symbol, startTime, null, this.statusClassForError(error), 'miss', false, attempt, error, options.runId);

        if (attempt < BACKOFF_CONFIG.maxRetries) {
          await this.backoff(attempt);
        }
      } catch (err: unknown) {
        // Check if it's a broker-level error (quota, circuit)
        if (this.isBrokerError(err)) {
          const brokerErr = err as any;
          if (callStarted) {
            this.quota.recordCallEnd(provider);
          }
          const statusClass = this.statusClassForError(brokerErr);
          const result = this.makeResult<T>(provider, operation, symbol, startTime, null, statusClass, 'miss', false, attempt, brokerErr, options.runId);

          this.ledger.record({
            runId: options.runId, provider, operation, symbol, requestKeyHash: keyHash,
            cacheState: ledgerCacheState, coalescedFollowerCount: this.coalescedFollowerCount(cacheKey),
            actualUpstreamCalls: attempt > 1 ? 1 : 0, attemptCount: attempt,
            statusClass, errorCategory: brokerErr.category,
            latencyMs: Date.now() - startTime,
            quotaRemaining: this.quota.getRunLevelRemaining(),
            cooldownUntil: this.cooldownUntil(provider),
            sourceAsOf, retrievedAt: new Date().toISOString(),
          });
          return result;
        }

        // Network error
        const error = classifyNetworkError(err);
        lastError = this.makeResult<T>(provider, operation, symbol, startTime, null, this.statusClassForError(error), 'miss', false, attempt, error, options.runId);

        if (error.retryable && attempt < BACKOFF_CONFIG.maxRetries) {
          if (callStarted) {
            this.quota.recordCallEnd(provider);
          }
          await this.backoff(attempt);
        } else {
          if (callStarted) {
            this.quota.recordCallEnd(provider);
          }
          break;
        }
      }
    }

    // All retries exhausted
    const finalErr = lastError?.error ?? errUnknown('All retries exhausted');
    const statusClass = this.statusClassForError(finalErr);
    const result = this.makeResult<T>(provider, operation, symbol, startTime, null, statusClass, 'miss', false, BACKOFF_CONFIG.maxRetries, finalErr, options.runId);
    this.store.setNegative(cacheKey, this.cacheTtlFor(operation, options.cachePolicy).negativeTtlMs);

    this.ledger.record({
      runId: options.runId, provider, operation, symbol, requestKeyHash: keyHash,
      cacheState: ledgerCacheState, coalescedFollowerCount: this.coalescedFollowerCount(cacheKey),
      actualUpstreamCalls: 1, attemptCount: BACKOFF_CONFIG.maxRetries,
      statusClass, errorCategory: finalErr.category,
      latencyMs: Date.now() - startTime,
      quotaRemaining: this.quota.getRunLevelRemaining(),
      cooldownUntil: this.cooldownUntil(provider),
      sourceAsOf, retrievedAt: new Date().toISOString(),
    });

    return result;
  }

  /**
   * Trigger async revalidation for stale cache.
   */
  private revalidateAsync<T>(
    keyHash: string,
    cacheKey: string,
    provider: string,
    operation: ProviderOperation,
    symbol: string,
    params: Record<string, unknown> | undefined,
    fetcher: (meta: { provider: string; operation: ProviderOperation; symbol: string; attempt: number }) => Promise<{ data: T; status: number; headers?: Record<string, string>; sourceAsOf?: string }>,
    options: BrokerExecuteOptions,
  ): void {
    // Fire and forget. Concurrent stale consumers attach to this same refresh.
    this.store.getOrCreateInFlight<T>(cacheKey, async () => {
      return this.executeUpstream(provider, operation, symbol, params, fetcher, keyHash, cacheKey, 'stale_revalidating', options);
    }).promise.catch(() => {
      // Revalidation failure is non-fatal — stale cache remains
    });
  }

  // ── Helpers ──

  private makeResult<T>(
    provider: string, operation: ProviderOperation, symbol: string, startTime: number,
    data: T | null, statusClass: StatusClass, cacheState: CacheState,
    coalesced: boolean, attemptCount: number, error: any, runId?: string,
  ): BrokerResult<T> {
    return {
      success: statusClass === 'success' || statusClass === 'coalesced',
      data,
      error,
      statusClass,
      cached: cacheState === 'fresh' || cacheState === 'stale',
      cacheState,
      coalesced,
      attemptCount,
      latencyMs: Date.now() - startTime,
      provider, operation, symbol,
      retrievedAt: new Date().toISOString(),
      runId,
    };
  }

  private cacheTtlFor(operation: ProviderOperation, override?: CachePolicy): { ttlMs: number; staleWindowMs: number; negativeTtlMs: number } {
    if (override) return override;
    switch (operation) {
      case 'quote': return { ttlMs: 30_000, staleWindowMs: 30_000, negativeTtlMs: 30_000 }; // 30s + 30s stale
      case 'metadata': return { ttlMs: 300_000, staleWindowMs: 300_000, negativeTtlMs: 60_000 }; // 5m + 5m
      case 'history': return { ttlMs: 600_000, staleWindowMs: 600_000, negativeTtlMs: 60_000 }; // 10m + 10m
      case 'financials':
      case 'key_ratios':
      case 'balance_sheet': return { ttlMs: 3_600_000, staleWindowMs: 3_600_000, negativeTtlMs: 120_000 }; // 1h + 1h
      case 'news': return { ttlMs: 120_000, staleWindowMs: 120_000, negativeTtlMs: 30_000 }; // 2m + 2m
      default: return { ttlMs: 60_000, staleWindowMs: 60_000, negativeTtlMs: 30_000 };
    }
  }

  private async backoff(attempt: number): Promise<void> {
    const delay = Math.min(BACKOFF_CONFIG.baseDelayMs * Math.pow(2, attempt - 1), BACKOFF_CONFIG.maxDelayMs);
    const jitter = delay * (0.5 + (globalThis.crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296) * 0.5); // 50-100% of delay
    await new Promise(resolve => setTimeout(resolve, jitter));
  }

  private isBrokerError(err: unknown): boolean {
    if (err && typeof err === 'object' && 'code' in (err as any) && 'category' in (err as any)) {
      const e = err as any;
      return e.code === 'RATE_LIMITED' || e.code === 'BUDGET_EXHAUSTED' || e.code === 'CIRCUIT_OPEN';
    }
    return false;
  }

  private coalescedFollowerCount(cacheKey: string): number {
    return Math.max(0, this.store.getInFlightConsumerCount(cacheKey) - 1);
  }

  private cooldownUntil(provider: string): number | null {
    const cooldownUntil = this.quota.getQuotaState(provider)?.cooldownUntil ?? 0;
    return cooldownUntil > Date.now() ? cooldownUntil : null;
  }

  private headerValue(headers: Record<string, string> | undefined, name: string): string | null {
    if (!headers) return null;
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === target) return value;
    }
    return null;
  }

  private statusClassForError(error: { category?: string; statusCode?: number; code?: string }): StatusClass {
    switch (error.category) {
      case 'retryable_429': return 'rate_limited';
      case 'non_retryable_401': return 'unauthorized';
      case 'non_retryable_404': return 'not_found';
      case 'non_retryable_400': return 'bad_request';
      case 'retryable_5xx': return 'server_error';
      case 'retryable_network': return 'network_error';
      case 'retryable_timeout': return 'timeout';
      case 'circuit_open': return 'circuit_open';
      case 'budget_exhausted': return 'budget_exhausted';
      default:
        if (error.statusCode === 429 || error.code === 'RATE_LIMITED') return 'rate_limited';
        return 'error';
    }
  }
}

export const providerRequestBroker = new ProviderRequestBroker();
