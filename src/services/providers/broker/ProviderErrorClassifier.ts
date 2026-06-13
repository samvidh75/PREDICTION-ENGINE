/**
 * F3.1A — ProviderErrorClassifier
 *
 * Classifies HTTP responses and errors into typed error categories for the
 * provider broker. Retry decisions are deterministic based on status code.
 */

import type { BrokerError, ErrorCategory } from './types';
import { errRateLimited, errServerError, errUnauthorized, errForbidden, errNotFound, errBadRequest, errNetworkError, errTimeout, errUnknown } from './ProviderBrokerErrors';

/**
 * Classify an HTTP status code into a BrokerError.
 * Non-retryable: 400, 401, 403, 404.
 * Retryable: 408, 425, 429, 5xx.
 */
export function classifyHttpStatus(statusCode: number, message?: string, retryAfterMs?: number): BrokerError {
  switch (statusCode) {
    case 400: return errBadRequest(message ?? 'Bad request');
    case 401: return errUnauthorized(message ?? 'Unauthorized');
    case 403: return errForbidden(message ?? 'Forbidden');
    case 404: return errNotFound(message ?? 'Not found');
    case 408:
    case 425: return errTimeout(message ?? `HTTP ${statusCode} — timeout`);
    case 429: return errRateLimited(retryAfterMs ?? 60_000);
    default:
      if (statusCode >= 500) {
        return errServerError(statusCode, message ?? `HTTP ${statusCode}`);
      }
      return errUnknown(message ?? `HTTP ${statusCode}`);
  }
}

/**
 * Classify a fetch/network error into a BrokerError.
 * Determines whether the error is retryable, timeouts vs. network vs. unknown.
 */
export function classifyNetworkError(error: unknown): BrokerError {
  const msg = error instanceof Error ? error.message : String(error);

  // Timeout detection
  if (error instanceof DOMException && error.name === 'AbortError') {
    return errTimeout(msg);
  }
  if (msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort')) {
    return errTimeout(msg);
  }

  // Network error detection
  if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch failed') || msg.toLowerCase().includes('econnrefused') || msg.toLowerCase().includes('enotfound')) {
    return errNetworkError(msg);
  }

  return errUnknown(msg);
}

/**
 * Extract Retry-After header value in milliseconds.
 */
export function parseRetryAfter(retryAfter: string | null): number | undefined {
  if (!retryAfter) return undefined;
  const value = Number(retryAfter);
  if (!Number.isNaN(value)) return value * 1000; // seconds → ms
  // HTTP-date format
  const parsed = new Date(retryAfter).getTime();
  if (!Number.isNaN(parsed)) return Math.max(0, parsed - Date.now());
  return 60_000; // default 60s
}
