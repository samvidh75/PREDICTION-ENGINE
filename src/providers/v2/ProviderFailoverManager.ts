/**
 * ProviderFailoverManager — TRACK-21 Phase 1 Task 4
 *
 * Field-level failover execution engine.
 *
 * When a provider fails for a specific field, this manager:
 *   1. Retries the same provider up to maxRetries times (exponential backoff)
 *   2. Falls through to the next provider in the resolved priority list
 *   3. Respects circuit breaker state before each call
 *   4. Records outcomes in ProviderHealthService
 *   5. Returns partial results — null fields are preserved, not synthetic-filled
 *
 * Key contract:
 *   - NEVER returns synthetic/hardcoded values
 *   - Supports partial field resolution (some fields populated, others null)
 *   - Tracks outage detection across providers
 */

import { ProviderCapabilityRegistry } from './ProviderCapabilityRegistry';
import { ProviderPriorityResolver, ResolutionContext } from './ProviderPriorityResolver';
import { ProviderHealthService, ProviderStatus } from './ProviderHealthService';
import ProviderCircuitBreaker, { CircuitState } from '../../services/providers/ProviderCircuitBreaker';

/** Function signature for a single field fetch from a provider. */
export type FieldFetcher = (symbol: string, field: string) => Promise<number | null>;

/** Provider adapter that maps provider names to their fetch implementations. */
export interface ProviderAdapter {
  name: string;
  /** Fetch ALL financial fields for a symbol at once. */
  fetchFinancials: (symbol: string) => Promise<Record<string, number | null>>;
}

export interface FailoverResult {
  symbol: string;
  fields: Record<string, number | null>;
  sourceMap: Record<string, string>;       // field → providerName
  failures: Array<{ field: string; provider: string; error: string }>;
  retryCount: number;
  providerSummary: Record<string, { attempted: number; succeeded: number; failed: number }>;
}

export interface BatchFailoverResult {
  results: FailoverResult[];
  summary: {
    total: number;
    succeeded: number;        // all critical fields populated
    partial: number;          // some fields populated
    failed: number;           // no fields populated
    averageFieldsPopulated: number;
  };
  providerOutages: string[];  // providers that failed entirely
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_BACKOFF_MS = 5_000;

export class ProviderFailoverManager {
  constructor(
    private capabilities: ProviderCapabilityRegistry,
    private priority: ProviderPriorityResolver,
    private health: ProviderHealthService,
  ) {}

  /**
   * Fetch all fields for a symbol with full field-level failover.
   * 
   * Algorithm per field:
   *   1. Resolve provider priority for this field
   *   2. For each provider in priority order:
   *      a. Check circuit breaker state
   *      b. Attempt fetch with up to maxRetries
   *      c. On success → record, move to next field
   *      d. On failure → try next provider
   *   3. If no provider succeeds → field = null (no synthetic fill)
   */
  async fetchAllFields(
    symbol: string,
    fields: string[],
    adapters: Map<string, ProviderAdapter>,
    breakers: Map<string, ProviderCircuitBreaker>,
    context?: ResolutionContext & { maxRetries?: number; baseBackoffMs?: number },
  ): Promise<FailoverResult> {
    const maxRetries = context?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const baseBackoffMs = context?.baseBackoffMs ?? DEFAULT_BASE_BACKOFF_MS;

    const resolvedFields: Record<string, number | null> = {};
    const sourceMap: Record<string, string> = {};
    const failures: FailoverResult['failures'] = [];
    const providerSummary: Record<string, { attempted: number; succeeded: number; failed: number }> = {};
    let totalRetries = 0;

    // Bulk-fetch approach: group fields by their primary provider to minimize API calls
    const fieldPriorityMap = new Map<string, string[]>();
    for (const field of fields) {
      const priority = this.priority.resolve(field, context);
      fieldPriorityMap.set(field, priority.orderedProviders);
    }

    // Process each field — try providers in priority order
    for (const field of fields) {
      const providerList = fieldPriorityMap.get(field) ?? [];
      let fieldResolved = false;

      for (const providerName of providerList) {
        if (fieldResolved) break;

        // Initialize provider summary if needed
        if (!providerSummary[providerName]) {
          providerSummary[providerName] = { attempted: 0, succeeded: 0, failed: 0 };
        }

        const breaker = breakers.get(providerName);
        const adapter = adapters.get(providerName);

        if (!adapter) {
          failures.push({ field, provider: providerName, error: 'No adapter registered' });
          continue;
        }

        // Check circuit breaker before attempting
        if (breaker) {
          const state = breaker.getState();
          await this.waitForBreakerCooldown(providerName, breaker);

          if (breaker.getState() === CircuitState.OPEN) {
            // Still open after waiting — skip this provider
            failures.push({ field, provider: providerName, error: 'Circuit breaker OPEN' });
            continue;
          }
        }

        // Attempt fetch with retries
        let success = false;
        let fieldValue: number | null = null;
        const maxRetriesForProvider = Math.min(maxRetries, 2); // Per-provider cap

        for (let attempt = 0; attempt <= maxRetriesForProvider; attempt++) {
          if (attempt > 0) totalRetries++;

          const startTime = Date.now();
          try {
            providerSummary[providerName].attempted++;

            // Execute through circuit breaker if available
            const fetcher = async () => {
              const allFields = await adapter.fetchFinancials(symbol);
              return allFields[field] ?? null;
            };

            const result = breaker
              ? await breaker.execute(fetcher)
              : await fetcher();

            const latency = Date.now() - startTime;
            this.health.recordCall(providerName, true, latency, result !== null ? 1 : 0, 1);
            this.health.updateCircuitBreakerState(providerName, breaker?.getState() ?? 'Unknown');
            providerSummary[providerName].succeeded++;

            fieldValue = result;
            success = true;
            break;
          } catch (err: any) {
            const latency = Date.now() - startTime;
            this.health.recordCall(providerName, false, latency, 0, 1);
            this.health.updateCircuitBreakerState(providerName, breaker?.getState() ?? 'Unknown');
            providerSummary[providerName].failed++;

            const isRateLimit = err.message?.includes('429') || err.message?.includes('Rate limit');
            if (isRateLimit) {
              this.health.recordRateLimit(providerName);
            }

            if (attempt < maxRetriesForProvider) {
              const backoff = this.backoff(attempt, baseBackoffMs);
              console.warn(`Failover: ${providerName}.${field} attempt ${attempt + 1} failed, retrying in ${backoff}ms: ${err.message?.substring(0, 80)}`);
              await this.sleep(backoff);
            }
          }
        }

        if (success) {
          resolvedFields[field] = fieldValue;
          sourceMap[field] = providerName;
          fieldResolved = true;
        } else {
          failures.push({
            field,
            provider: providerName,
            error: `All ${maxRetriesForProvider + 1} attempts failed`,
          });
          // Continue to next provider in priority list
        }
      }

      // If no provider succeeded, field remains null (no synthetic fill)
      if (!fieldResolved) {
        resolvedFields[field] = null;
      }
    }

    return {
      symbol,
      fields: resolvedFields,
      sourceMap,
      failures,
      retryCount: totalRetries,
      providerSummary,
    };
  }

  /**
   * Fetch financials for multiple symbols in batch mode with circuit breaker awareness.
   */
  async fetchBatch(
    symbols: string[],
    fields: string[],
    adapters: Map<string, ProviderAdapter>,
    breakers: Map<string, ProviderCircuitBreaker>,
    context?: ResolutionContext & { maxRetries?: number; baseBackoffMs?: number },
  ): Promise<BatchFailoverResult> {
    const results: FailoverResult[] = [];
    const providerOutages = new Set<string>();

    for (const symbol of symbols) {
      const result = await this.fetchAllFields(symbol, fields, adapters, breakers, context);
      results.push(result);

      // Track providers that had ALL attempts fail
      if (result.failures.length > 0) {
        const providerNames = new Set(result.failures.map(f => f.provider));
        for (const pn of providerNames) {
          const summary = result.providerSummary[pn];
          if (summary && summary.succeeded === 0 && summary.attempted > 0) {
            providerOutages.add(pn);
          }
        }
      }
    }

    // Compute batch summary
    const total = results.length;
    const populatedCounts = results.map(r => Object.values(r.fields).filter(v => v !== null).length);
    
    let succeeded = 0;
    let partial = 0;
    let failed = 0;

    for (const count of populatedCounts) {
      if (count === fields.length) succeeded++;
      else if (count > 0) partial++;
      else failed++;
    }

    const avgPopulated = populatedCounts.length > 0
      ? populatedCounts.reduce((a, b) => a + b, 0) / populatedCounts.length
      : 0;

    return {
      results,
      summary: {
        total,
        succeeded,
        partial,
        failed,
        averageFieldsPopulated: Math.round(avgPopulated * 10) / 10,
      },
      providerOutages: Array.from(providerOutages),
    };
  }

  /**
   * Detect if any provider has a full outage based on health.
   */
  detectOutages(): string[] {
    const outages: string[] = [];
    for (const stats of this.health.getAllStats()) {
      if (stats.status === 'Unavailable') {
        outages.push(stats.providerName);
      }
    }
    return outages;
  }

  // ── Private ──────────────────────────────────────────────

  private async waitForBreakerCooldown(providerName: string, breaker: ProviderCircuitBreaker): Promise<void> {
    // CircuitBreaker.execute() already handles transition from OPEN → HALF_OPEN
    // via checking nextAttempt timeout. We just need to wait if it's still OPEN.
    if (breaker.getState() === CircuitState.OPEN) {
      // The breaker's execute method checks internally — we just log
      console.log(`Failover: ${providerName} circuit is OPEN, will wait on execute`);
    }
  }

  private backoff(attempt: number, baseMs: number): number {
    const exponential = baseMs * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return exponential + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default ProviderFailoverManager;
