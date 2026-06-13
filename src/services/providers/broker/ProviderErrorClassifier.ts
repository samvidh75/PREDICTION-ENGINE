/**
 * F3.1A — ProviderErrorClassifier
 *
 * Classifies HTTP responses and errors into typed error categories for the
 * provider broker. Retry decisions are deterministic based on status code.
 */

import type { BrokerError } from './types';
import { errRateLimited, errServerError, errUnauthorized, errForbidden, errNotFound, errBadRequest, errNetworkError, errTimeout, errUnknown } from './ProviderBrokerErrors';

/**
 * Classify an HTTP status code into a BrokerError.
 * Non-retryable: 400, 401, 403, 404.
 * Retryable: 408, 425, 429, 5xx.
 */
export function classifyHttpStatus(statusCode: number, message?: string, retryAfterMs?: number): BrokerError {
  const safeMessage = sanitizeErrorMessage(message);
  switch (statusCode) {
    case 400: return errBadRequest(safeMessage ?? 'Bad request');
    case 401: return errUnauthorized(safeMessage ?? 'Unauthorized');
    case 403: return errForbidden(safeMessage ?? 'Forbidden');
    case 404: return errNotFound(safeMessage ?? 'Not found');
    case 408:
    case 425: return errTimeout(safeMessage ?? `HTTP ${statusCode} — timeout`);
    case 429: return errRateLimited(retryAfterMs ?? 60_000);
    default:
      if (statusCode >= 500 && statusCode <= 599) {
        return errServerError(statusCode, safeMessage ?? `HTTP ${statusCode}`);
      }
      return errUnknown(safeMessage ?? `HTTP ${statusCode}`);
  }
}

/**
 * Classify a fetch/network error into a BrokerError.
 * Determines whether the error is retryable, timeouts vs. network vs. unknown.
 */
export function classifyNetworkError(error: unknown): BrokerError {
  const msg = sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) ?? 'Unknown provider error';
  const name = error && typeof error === 'object' && 'name' in error
    ? String((error as { name?: unknown }).name)
    : '';
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code)
    : '';
  const text = `${name} ${code} ${msg}`.toLowerCase();

  // Timeout detection
  if (isAbortError(error)) {
    return errTimeout(msg);
  }
  if (text.includes('timeout') || text.includes('timedout') || text.includes('abort') || text.includes('etimedout')) {
    return errTimeout(msg);
  }

  // Network error detection
  if (text.includes('network') || text.includes('fetch failed') || text.includes('econnrefused') || text.includes('enotfound') || text.includes('eai_again') || text.includes('socket')) {
    return errNetworkError(msg);
  }

  return errUnknown(msg);
}

function sanitizeErrorMessage(message: string | undefined): string | undefined {
  if (!message) return undefined;
  return message
    .replace(/(token|api[_-]?key|apikey|key|secret|access[_-]?token)=([^&\s]+)/gi, '$1=[REDACTED]')
    .replace(/bearer\s+[a-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/authorization:\s*[^\s]+/gi, 'authorization:[REDACTED]');
}

/**
 * Extract Retry-After header value in milliseconds.
 */
export function parseRetryAfter(retryAfter: string | null): number | undefined {
  const header = retryAfter?.trim();
  if (!header) return undefined;
  const value = Number(header);
  if (Number.isFinite(value) && value >= 0) return value * 1000; // seconds → ms
  // HTTP-date format
  const parsed = new Date(header).getTime();
  if (!Number.isNaN(parsed)) return Math.max(0, parsed - Date.now());
  return 60_000; // default 60s
}

function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error ? (error as { name?: unknown }).name : undefined;
  if (name === 'AbortError') return true;

  const domExceptionCtor = globalThis.DOMException;
  return typeof domExceptionCtor !== 'undefined' && error instanceof domExceptionCtor && error.name === 'AbortError';
}
