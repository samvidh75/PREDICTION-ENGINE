/**
 * EodRefreshScheduler — Proactive EOD market data refresh for an active universe.
 *
 * Warmly loads quotes, profiles, financials, and history for a configurable
 * set of watched symbols so that user page-loads find cached data and avoid
 * provider fallback calls.
 *
 * Consumption budgeting:
 *   - Each refresh cycle tracks how many provider calls were actually made
 *     (as opposed to cache-hits that were already fresh).
 *   - The scheduler respects a per-cycle call budget and stops enrolling
 *     symbols once the budget is exhausted.
 *   - An in-memory cooldown map prevents re-refreshing the same symbol
 *     more than once per `cooldownMs` window.
 */

import { ProviderCoordinator } from '../providers/ProviderCoordinator';
import { EodDataCacheService } from '../marketData/EodDataCacheService';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EodRefreshResult {
  attempted: number;
  cacheHit: number;
  providerCalled: number;
  succeeded: number;
  failed: number;
  budgetExhausted: boolean;
  elapsedMs: number;
  details: EodSymbolResult[];
}

export interface EodSymbolResult {
  symbol: string;
  cacheHit: boolean;
  success: boolean;
  error?: string;
  namespaces: ('quote' | 'profile' | 'financials' | 'history' | 'news')[];
}

export interface EodRefreshConfig {
  /** Maximum provider calls per cycle (prevents budget blowout). */
  budgetPerCycle: number;
  /** Symbols to refresh in this cycle. */
  symbols: string[];
  /** Namespaces to refresh per symbol (default: quote, profile, financials). */
  namespaces?: ('quote' | 'profile' | 'financials' | 'history' | 'news')[];
  /** Minimum ms between refreshes of the same symbol. */
  cooldownMs: number;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: Required<Pick<EodRefreshConfig, 'budgetPerCycle' | 'namespaces' | 'cooldownMs'>> = {
  budgetPerCycle: 150,
  namespaces: ['quote', 'profile', 'financials'],
  cooldownMs: 86_400_000, // 24h
};

// ---------------------------------------------------------------------------
// Cooldown tracker
// ---------------------------------------------------------------------------

const lastRefreshTime = new Map<string, number>();

function isOnCooldown(symbol: string, cooldownMs: number): boolean {
  const last = lastRefreshTime.get(symbol.toUpperCase());
  if (last === undefined) return false;
  return Date.now() - last < cooldownMs;
}

function markRefreshed(symbol: string): void {
  lastRefreshTime.set(symbol.toUpperCase(), Date.now());
}

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

const coordinator = new ProviderCoordinator();

export class EodRefreshScheduler {
  /**
   * Run one refresh cycle. Returns a detailed report of what happened.
   */
  static async runCycle(config: EodRefreshConfig): Promise<EodRefreshResult> {
    const namespaces = config.namespaces ?? DEFAULT_CONFIG.namespaces;
    const budget = config.budgetPerCycle ?? DEFAULT_CONFIG.budgetPerCycle;
    const cooldown = config.cooldownMs ?? DEFAULT_CONFIG.cooldownMs;
    const startMs = Date.now();

    let providerCalls = 0;
    const details: EodSymbolResult[] = [];

    for (const rawSymbol of config.symbols) {
      const symbol = rawSymbol.toUpperCase().trim();
      if (!symbol) continue;

      // Cooldown check
      if (isOnCooldown(symbol, cooldown)) {
        details.push({ symbol, cacheHit: true, success: true, namespaces: [] });
        continue;
      }

      // Budget check — stop enrolling once exhausted
      if (providerCalls >= budget) {
        details.push({ symbol, cacheHit: true, success: true, namespaces: [] });
        continue;
      }

      const symbolResult: EodSymbolResult = {
        symbol,
        cacheHit: true,
        success: true,
        namespaces: [],
      };

      for (const ns of namespaces) {
        // Check L2 cache first
        const cached = await EodDataCacheService.get(ns, symbol);
        if (cached !== null) {
          symbolResult.namespaces.push(ns);
          continue;
        }

        // Budget check per namespace
        if (providerCalls >= budget) {
          symbolResult.namespaces.push(ns);
          continue;
        }

        // Call provider and backfill cache
        try {
          providerCalls++;
          symbolResult.cacheHit = false;
          await backfillCacheNamespace(ns, symbol);
          symbolResult.namespaces.push(ns);
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          symbolResult.success = false;
          symbolResult.error = msg;
          symbolResult.namespaces.push(ns);
        }
      }

      markRefreshed(symbol);
      details.push(symbolResult);
    }

    const attempted = config.symbols.length;
    const cacheHit = details.filter((d) => d.cacheHit).length;
    const succeeded = details.filter((d) => d.success).length;
    const failed = details.filter((d) => !d.success).length;

    return {
      attempted,
      cacheHit,
      providerCalled: providerCalls,
      succeeded,
      failed,
      budgetExhausted: providerCalls >= budget,
      elapsedMs: Date.now() - startMs,
      details,
    };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function backfillCacheNamespace(ns: string, symbol: string): Promise<void> {
  switch (ns) {
    case 'quote': {
      const quote = await coordinator.getQuote(symbol);
      await EodDataCacheService.set('quote', symbol, quote);
      return;
    }
    case 'profile': {
      const meta = await coordinator.getMetadata(symbol);
      await EodDataCacheService.set('profile', symbol, meta);
      return;
    }
    case 'financials': {
      const fin = await coordinator.getFinancials(symbol);
      await EodDataCacheService.set('financials', symbol, fin);
      return;
    }
    case 'history': {
      const hist = await coordinator.getHistory(symbol);
      await EodDataCacheService.set('history', symbol, hist);
      return;
    }
    case 'news': {
      const news = await coordinator.getNews(symbol);
      await EodDataCacheService.set('news', symbol, news);
      return;
    }
    default:
      throw new Error(`Unknown cache namespace: ${ns}`);
  }
}
