/**
 * ProviderPriorityResolver — TRACK-21 Phase 1 Task 3
 *
 * Dynamically orders providers for each field based on:
 *   - CapabilityRegistry (which providers can supply the field)
 *   - HealthService (which providers are currently healthy)
 *   - Per-field precedence rules (configurable priority ordering)
 *
 * Field-level precedence (from TRACK-21 spec):
 *   PE:          Finnhub > Screener > Yahoo
 *   RevenueGrowth: Screener > Finnhub
 *   ROA:        Finnhub > Upstox > DerivedMetricsEngine
 *   pbRatio:    Finnhub > Upstox
 *   roe:        Finnhub > Upstox
 *   roic:       Finnhub > Upstox > DerivedMetricsEngine
 *   evEbitda:   Finnhub > Upstox
 *   debtToEquity: Finnhub > Upstox > DerivedMetricsEngine
 *   marketCap:  Finnhub > Screener
 *   eps:        Finnhub > DerivedMetricsEngine
 *   dividendYield: Finnhub > Screener
 *   beta:       Finnhub
 *   fcfYield:   Finnhub > DerivedMetricsEngine
 *   revenueGrowth: Screener > Finnhub > DerivedMetricsEngine
 *   profitGrowth: Screener > Finnhub > DerivedMetricsEngine
 *   epsGrowth:  Finnhub > Screener > DerivedMetricsEngine
 *   fcfGrowth:  Finnhub > Screener > DerivedMetricsEngine
 *   grossMargin: Finnhub > DerivedMetricsEngine
 *   operatingMargin: Finnhub > Screener > DerivedMetricsEngine
 *   currentRatio: Finnhub > Screener > DerivedMetricsEngine
 */

import { ProviderCapabilityRegistry, ProviderCapability } from './ProviderCapabilityRegistry';
import { ProviderHealthService, ProviderStatus } from './ProviderHealthService';

export interface ProviderPriority {
  field: string;
  orderedProviders: string[];
  reason: string;
}

export interface ResolutionContext {
  skipRateLimited?: boolean;
  skipDegraded?: boolean;
  requireNonAuth?: boolean;  // Only use providers without auth (for fallback)
}

/** Per-field precedence: ordered list of provider preference. */
const FIELD_PRECEDENCE: Record<string, string[]> = {
  peRatio: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'ScreenerProvider'],
  pbRatio: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  roe: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  roa: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'DerivedMetricsEngine'],
  roic: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'DerivedMetricsEngine'],
  evEbitda: ['FinnhubProvider', 'UpstoxFundamentalsProvider'],
  debtToEquity: ['FinnhubProvider', 'UpstoxFundamentalsProvider', 'DerivedMetricsEngine'],
  marketCap: ['FinnhubProvider', 'ScreenerProvider'],
  eps: ['FinnhubProvider', 'DerivedMetricsEngine'],
  dividendYield: ['FinnhubProvider', 'ScreenerProvider'],
  beta: ['FinnhubProvider'],
  freeFloat: [],
  fcfYield: ['FinnhubProvider', 'DerivedMetricsEngine'],
  revenueGrowth: ['ScreenerProvider', 'FinnhubProvider', 'DerivedMetricsEngine'],
  profitGrowth: ['ScreenerProvider', 'FinnhubProvider', 'DerivedMetricsEngine'],
  epsGrowth: ['FinnhubProvider', 'ScreenerProvider', 'DerivedMetricsEngine'],
  fcfGrowth: ['FinnhubProvider', 'ScreenerProvider', 'DerivedMetricsEngine'],
  grossMargin: ['FinnhubProvider', 'DerivedMetricsEngine'],
  operatingMargin: ['FinnhubProvider', 'ScreenerProvider', 'DerivedMetricsEngine'],
  currentRatio: ['FinnhubProvider', 'ScreenerProvider', 'DerivedMetricsEngine'],
};

export class ProviderPriorityResolver {
  constructor(
    private capabilities: ProviderCapabilityRegistry,
    private health: ProviderHealthService,
  ) {}

  /**
   * Resolve the best ordered provider list for a single field.
   * Filters providers by health, then sorts by precedence + reliability * health score.
   */
  resolve(field: string, context?: ResolutionContext): ProviderPriority {
    const allProviders = this.capabilities.getProvidersForField(field);
    const precedence = FIELD_PRECEDENCE[field] ?? [];

    if (allProviders.length === 0) {
      return {
        field,
        orderedProviders: [],
        reason: 'No provider registered for this field',
      };
    }

    // Filter by health
    const filtered = allProviders.filter(cap => {
      const status = this.health.getStatus(cap.provider);
      if (status === 'Unavailable') return false;
      if (context?.skipRateLimited && status === 'RateLimited') return false;
      if (context?.skipDegraded && status === 'Degraded') return false;
      if (context?.requireNonAuth && cap.authRequired) return false;
      return true;
    });

    if (filtered.length === 0) {
      const statuses = allProviders.map(c => `${c.provider}:${this.health.getStatus(c.provider)}`).join(', ');
      return {
        field,
        orderedProviders: [],
        reason: `All providers unhealthy or filtered: ${statuses}`,
      };
    }

    // Sort by precedence (lower index = higher priority), then reliability * health
    const sorted = [...filtered].sort((a, b) => {
      const aIdx = precedence.indexOf(a.provider);
      const bIdx = precedence.indexOf(b.provider);

      // Precedence takes priority
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;

      // Fallback: sort by (reliability × health_score)
      const aHealth = this.providerHealthScore(a.provider);
      const bHealth = this.providerHealthScore(b.provider);
      return (b.reliability * bHealth) - (a.reliability * aHealth);
    });

    const primaryProvider = sorted[0]?.provider ?? 'none';
    const reason = this.buildReason(field, sorted, allProviders);

    return {
      field,
      orderedProviders: sorted.map(s => s.provider),
      reason,
    };
  }

  /**
   * Resolve all fields at once.
   */
  resolveAll(fields: string[], context?: ResolutionContext): Map<string, ProviderPriority> {
    const result = new Map<string, ProviderPriority>();
    for (const field of fields) {
      result.set(field, this.resolve(field, context));
    }
    return result;
  }

  /**
   * Get a summary of field-level resolution: which field is resolved by which provider.
   */
  getResolutionSummary(fields: string[]): Record<string, { primary: string; fallbacks: string[]; reason: string }> {
    const summary: Record<string, { primary: string; fallbacks: string[]; reason: string }> = {};
    for (const field of fields) {
      const result = this.resolve(field);
      summary[field] = {
        primary: result.orderedProviders[0] ?? 'none',
        fallbacks: result.orderedProviders.slice(1),
        reason: result.reason,
      };
    }
    return summary;
  }

  /**
   * Count how many fields each provider is the primary for.
   */
  getPrimaryProviderCounts(fields: string[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const field of fields) {
      const result = this.resolve(field);
      const primary = result.orderedProviders[0];
      if (primary) {
        counts.set(primary, (counts.get(primary) ?? 0) + 1);
      }
    }
    return counts;
  }

  // ── Private ──────────────────────────────────────────────

  private providerHealthScore(provider: string): number {
    const status = this.health.getStatus(provider);
    const stats = this.health.getStats(provider);
    switch (status) {
      case 'Healthy': return 0.9 + stats.successRate * 0.1;
      case 'Degraded': return 0.5;
      case 'RateLimited': return 0.3;
      case 'Unavailable': return 0;
      default: return 0.5;
    }
  }

  private buildReason(field: string, sorted: ProviderCapability[], all: ProviderCapability[]): string {
    if (sorted.length === 0) {
      const unavailable = all.map(c => c.provider).join(', ');
      return `No providers available for ${field} (unavailable: ${unavailable || 'none registered'})`;
    }

    const filteredOut = all.filter(c => !sorted.includes(c));
    const sortedNames = sorted.map(s => s.provider).join(' > ');

    if (filteredOut.length > 0) {
      const filteredNames = filteredOut.map(f => `${f.provider}(${this.health.getStatus(f.provider)})`).join(', ');
      return `${field}: ${sortedNames} | filtered: ${filteredNames}`;
    }

    return `${field}: ${sortedNames} | all providers healthy`;
  }
}

export default ProviderPriorityResolver;
