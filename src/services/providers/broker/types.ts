/**
 * F3.1A — Provider Request Broker — Core Types
 */

/** Operations each provider can perform. */
export type ProviderOperation = 'quote' | 'metadata' | 'history' | 'financials' | 'news' | 'key_ratios' | 'balance_sheet';

/** Status class returned by the broker for each request. */
export type StatusClass = 'success' | 'coalesced' | 'rate_limited' | 'unauthorized' | 'not_found' | 'bad_request' | 'server_error' | 'network_error' | 'timeout' | 'circuit_open' | 'budget_exhausted' | 'error';

/** Cache state for a broker response. */
export type CacheState = 'fresh' | 'stale' | 'stale_revalidating' | 'negative' | 'miss';

/** Provider run-level budget state. */
export type BudgetState = 'ok' | 'warning' | 'exhausted';

/** Error categories for classification. */
export type ErrorCategory = 'retryable_network' | 'retryable_timeout' | 'retryable_5xx' | 'retryable_429' | 'non_retryable_4xx' | 'non_retryable_401' | 'non_retryable_403' | 'non_retryable_404' | 'non_retryable_400' | 'non_retryable_unknown' | 'circuit_open' | 'budget_exhausted' | 'unknown';

/** Single-flight request state. */
export interface InFlightRequest<T = unknown> {
  promise: Promise<BrokerResult<T>>;
  createdAt: number;
  consumerCount: number;
}

/** A normalized request key for deduplication. */
export interface RequestKey {
  provider: string;
  operation: ProviderOperation;
  symbol: string;
  paramsHash: string;
}

/** Quota state for a single provider. */
export interface ProviderQuotaState {
  provider: string;
  minuteWindow: { count: number; resetAt: number };
  dayWindow: { count: number; resetAt: number };
  burstWindow: { count: number; resetAt: number };
  concurrentCount: number;
  cooldownUntil: number;
  totalCalls: number;
}

/** The result envelope returned by the broker. */
export interface BrokerResult<T = unknown> {
  success: boolean;
  data: T | null;
  error: BrokerError | null;
  statusClass: StatusClass;
  cached: boolean;
  cacheState: CacheState;
  coalesced: boolean;
  attemptCount: number;
  latencyMs: number;
  provider: string;
  operation: ProviderOperation;
  symbol: string;
  retrievedAt: string;
}

/** Structured broker error (never contains secrets). */
export interface BrokerError {
  code: string;
  message: string;
  category: ErrorCategory;
  retryable: boolean;
  statusCode?: number;
  retryAfterMs?: number;
}

/** Call ledger entry — one row per actual upstream request. */
export interface CallLedgerEntry {
  id: string;
  provider: string;
  operation: ProviderOperation;
  symbol: string;
  requestKeyHash: string;
  cacheState: CacheState;
  coalescedFollowerCount: number;
  actualUpstreamCalls: number;
  attemptCount: number;
  statusClass: StatusClass;
  errorCategory: ErrorCategory | null;
  latencyMs: number;
  quotaRemaining: number;
  cooldownUntil: number | null;
  sourceAsOf: string | null;
  retrievedAt: string;
  createdAt: string;
}

/** Budget configuration for a provider. */
export interface ProviderBudgetConfig {
  provider: string;
  perMinute: number;
  perDay: number;
  burst: number;
  maxConcurrent: number;
  cooldownMs: number;
}

/** Cache policy for a provider-operation pair. */
export interface CachePolicy {
  ttlMs: number;
  staleWindowMs: number;
  negativeTtlMs: number;
}
