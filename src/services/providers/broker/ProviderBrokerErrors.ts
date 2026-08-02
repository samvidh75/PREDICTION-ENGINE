/**
 * F3.1A — ProviderBrokerErrors
 *
 * Central error definitions for the provider broker layer.
 * Never contains secrets, tokens, or raw provider URLs.
 */

import type { BrokerError, ErrorCategory } from './types';

/** Build a BrokerError with correct category and retryable flag. */
export function brokerError(
  code: string,
  message: string,
  category: ErrorCategory,
  statusCode?: number,
  retryAfterMs?: number,
): BrokerError {
  const retryable = isRetryableCategory(category);
  return { code, message, category, retryable, statusCode, retryAfterMs };
}

function isRetryableCategory(category: ErrorCategory): boolean {
  switch (category) {
    case 'retryable_network':
    case 'retryable_timeout':
    case 'retryable_5xx':
    case 'retryable_429':
      return true;
    default:
      return false;
  }
}

/** Error factories */

export function errNetworkError(message: string): BrokerError {
  return brokerError('NETWORK_ERROR', message, 'retryable_network');
}

export function errTimeout(message: string): BrokerError {
  return brokerError('TIMEOUT', message, 'retryable_timeout');
}

export function errServerError(statusCode: number, message: string): BrokerError {
  return brokerError('SERVER_ERROR', message, 'retryable_5xx', statusCode);
}

export function errRateLimited(retryAfterMs: number): BrokerError {
  return brokerError('RATE_LIMITED', `Rate limited. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`, 'retryable_429', 429, retryAfterMs);
}

export function errUnauthorized(message: string): BrokerError {
  return brokerError('UNAUTHORIZED', message, 'non_retryable_401', 401);
}

export function errForbidden(message: string): BrokerError {
  return brokerError('FORBIDDEN', message, 'non_retryable_403', 403);
}

export function errNotFound(message: string): BrokerError {
  return brokerError('NOT_FOUND', message, 'non_retryable_404', 404);
}

export function errBadRequest(message: string): BrokerError {
  return brokerError('BAD_REQUEST', message, 'non_retryable_400', 400);
}

export function errCircuitOpen(provider: string): BrokerError {
  return brokerError('CIRCUIT_OPEN', `Circuit breaker open for ${provider}.`, 'circuit_open');
}

export function errBudgetExhausted(provider: string): BrokerError {
  return brokerError('BUDGET_EXHAUSTED', `Provider ${provider} budget exhausted.`, 'budget_exhausted');
}

export function errUnknown(message: string): BrokerError {
  return brokerError('UNKNOWN', message, 'unknown');
}
