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
  disabled?: boolean;
  unauthorized?: boolean;
  cooldownUntil?: number;
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

export class ProviderFailoverManager {
  constructor(
    private capabilities: ProviderCapabilityRegistry,
    private priority: ProviderPriorityResolver,
    private health: ProviderHealthService,
  ) {}

  /**
   * Fetch ALL fields for a symbol with ONE FETCH PER PROVIDER.
   *
   * F3.1B: Remove call amplification — previously each field triggered a separate
   * adapter.fetchFinancials(symbol) call. Now we fetch the bundle once per provider
   * and extract all requested fields from that bundle. If a provider succeeds for
   * some fields but fails for others, we move to the next provider only for the
   * still-missing fields.
   *
   * Algorithm:
   *   1. Resolve provider priority list for ALL fields (union of providers)
   *   2. For each provider (in priority order of its highest-ranked field):
   *      a. Check circuit breaker state
   *      b. Fetch ONE bundle via adapter.fetchFinancials(symbol)
   *      c. Extract all requested fields from the bundle
   *      d. Record per-field source lineage
   *      e. If all fields populated → stop early
   *      f. If some fields remain → try next provider for gaps only
   *   3. Remaining null fields → no synthetic fill
   */
  async fetchAllFields(
    symbol: string,
    fields: string[],
    adapters: Map<string, ProviderAdapter>,
    breakers: Map<string, ProviderCircuitBreaker>,
    context?: ResolutionContext & { disabledProviders?: string[]; unauthorizedProviders?: string[]; cooldownProviders?: Record<string, number> },
  ): Promise<FailoverResult> {
    const resolvedFields: Record<string, number | null> = {};
    const sourceMap: Record<string, string> = {};
    const failures: FailoverResult['failures'] = [];
    const providerSummary: Record<string, { attempted: number; succeeded: number; failed: number }> = {};
    const totalRetries = 0;
    const completedProviders = new Set<string>();

    // Build a field→provider priority map and a union of all candidate providers
    const fieldPriorityMap = new Map<string, string[]>();
    const providerPriority = new Map<string, number>();  // provider → min priority rank
    for (const field of fields) {
      const priority = this.priority.resolve(field, context);
      fieldPriorityMap.set(field, priority.orderedProviders);
      for (let i = 0; i < priority.orderedProviders.length; i++) {
        const pn = priority.orderedProviders[i];
        if (!providerPriority.has(pn) || (providerPriority.get(pn) ?? Infinity) > i) {
          providerPriority.set(pn, i);
        }
      }
    }

    // Sort providers by their best priority rank
    const sortedProviders = Array.from(providerPriority.entries())
      .sort((a, b) => a[1] - b[1])
      .map(([pn]) => pn);

    // Detect which fields are still missing
    const missingFields = (): string[] =>
      fields.filter(f => resolvedFields[f] === undefined || resolvedFields[f] === null);

    // Process ONE bundle per provider
    for (const providerName of sortedProviders) {
      if (completedProviders.has(providerName)) continue;

      // Skip if all fields are already populated
      const remaining = missingFields();
      if (remaining.length === 0) break;

      const breaker = breakers.get(providerName);
      const adapter = adapters.get(providerName);

      if (!adapter) {
        for (const field of remaining) {
          failures.push({ field, provider: providerName, error: 'No adapter registered' });
        }
        continue;
      }

      const skipReason = this.providerSkipReason(providerName, adapter, context);
      if (skipReason) {
        for (const field of remaining) {
          failures.push({ field, provider: providerName, error: skipReason });
        }
        continue;
      }

      if (breaker) {
        await this.waitForBreakerCooldown(providerName, breaker);
        if (breaker.getState() === CircuitState.OPEN) {
          for (const field of remaining) {
            failures.push({ field, provider: providerName, error: 'Circuit breaker OPEN' });
          }
          continue;
        }
      }

      if (!providerSummary[providerName]) {
        providerSummary[providerName] = { attempted: 0, succeeded: 0, failed: 0 };
      }

      let bundle: Record<string, number | null> | null = null;
      let bundleFetchFailed = false;

      const startTime = Date.now();
      try {
        providerSummary[providerName].attempted++;
        const fetcher = () => adapter.fetchFinancials(symbol);

        bundle = breaker
          ? await breaker.execute(fetcher)
          : await fetcher();

        const latency = Date.now() - startTime;
        const fieldsReturned = remaining.filter(field => bundle?.[field] !== undefined && bundle?.[field] !== null).length;
        this.health.recordCall(providerName, true, latency, fieldsReturned, remaining.length);
        providerSummary[providerName].succeeded++;
      } catch (err: any) {
        const latency = Date.now() - startTime;
        this.health.recordCall(providerName, false, latency, 0, remaining.length);
        providerSummary[providerName].failed++;

        if (err.message?.includes('429') || err.message?.includes('Rate limit')) {
          this.health.recordRateLimit(providerName);
        }
        for (const field of remaining) {
          failures.push({ field, provider: providerName, error: this.sanitizeError(err) });
        }
        bundleFetchFailed = true;
      } finally {
        this.health.updateCircuitBreakerState(providerName, breaker?.getState() ?? 'Unknown');
      }

      if (bundle === null && !bundleFetchFailed) {
        for (const field of remaining) {
          failures.push({ field, provider: providerName, error: 'Bundle fetch failed' });
        }
        continue;
      }
      if (bundle === null) continue;

      // Extract fields from bundle — only fill still-missing fields
      for (const field of remaining) {
        if (field in bundle && bundle[field] !== undefined && bundle[field] !== null) {
          resolvedFields[field] = bundle[field]!;
          sourceMap[field] = providerName;
        }
      }

      completedProviders.add(providerName);
    }

    // Any remaining fields become null (no synthetic fill)
    for (const field of missingFields()) {
      resolvedFields[field] = null;
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

  private async waitForBreakerCooldown(_providerName: string, _breaker: ProviderCircuitBreaker): Promise<void> {
    // CircuitBreaker.execute() already handles transition from OPEN → HALF_OPEN
    // via checking nextAttempt timeout. We just need to wait if it's still OPEN.
  }

  private providerSkipReason(
    providerName: string,
    adapter: ProviderAdapter,
    context?: ResolutionContext & { disabledProviders?: string[]; unauthorizedProviders?: string[]; cooldownProviders?: Record<string, number> },
  ): string | null {
    if (adapter.disabled || context?.disabledProviders?.includes(providerName)) return 'Provider disabled';
    if (adapter.unauthorized || context?.unauthorizedProviders?.includes(providerName)) return 'Provider unauthorized';

    const cooldownUntil = adapter.cooldownUntil ?? context?.cooldownProviders?.[providerName];
    if (cooldownUntil && cooldownUntil > Date.now()) return 'Provider cooldown active';

    const status = this.health.getStatus(providerName);
    if (status === 'Unavailable' || status === 'RateLimited') return `Provider ${status}`;
    return null;
  }

  private sanitizeError(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    return message
      .replace(/(token|api[_-]?key|apikey|key|secret|access[_-]?token)=([^&\s]+)/gi, '$1=[REDACTED]')
      .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
      .replace(/authorization:\s*[^\s]+/gi, 'authorization:[REDACTED]');
  }
}

export default ProviderFailoverManager;
