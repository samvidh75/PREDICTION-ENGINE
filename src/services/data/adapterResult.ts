// src/services/data/adapterResult.ts
// Phase 2 – Result constructors and combinators for AdapterResult<T>.
//
// All helpers ensure:
//  1. Error codes never leak to public UX (safeErrorNote maps internal→public).
//  2. Warnings are filtered before public exposure.
//  3. Partial failures are tolerated for evidence pack building.

import type { AdapterResult, AdapterWarning, AdapterErrorCode } from './dataAdapterTypes';

// ─── Constructors ───────────────────────────────────────────────────────────

export function adapterOk<T>(data: T, warnings: AdapterWarning[] = []): AdapterResult<T> {
  return {
    ok: true,
    data,
    warnings,
    asOf: new Date().toISOString(),
  };
}

export function adapterErr<T>(
  errorCode: AdapterErrorCode,
  warnings: AdapterWarning[] = [],
): AdapterResult<T> {
  return {
    ok: false,
    data: null,
    warnings,
    errorCode,
    asOf: new Date().toISOString(),
  };
}

// ─── Type Guards ────────────────────────────────────────────────────────────

export function isAdapterOk<T>(result: AdapterResult<T>): result is AdapterResult<T> & { ok: true; data: T } {
  return result.ok === true;
}

export function isAdapterErr<T>(result: AdapterResult<T>): result is AdapterResult<T> & { ok: false; data: null; errorCode: AdapterErrorCode } {
  return result.ok === false;
}

// ─── Unwrap ─────────────────────────────────────────────────────────────────

export function unwrapResult<T>(result: AdapterResult<T>): T {
  if (!result.ok) {
    throw new Error(`Cannot unwrap failed result: ${result.errorCode}`);
  }
  return result.data;
}

export function unwrapOr<T>(result: AdapterResult<T>, fallback: T): T {
  return result.ok ? result.data : fallback;
}

// ─── Combinators ────────────────────────────────────────────────────────────

export function mapResult<T, U>(result: AdapterResult<T>, fn: (data: T) => U): AdapterResult<U> {
  if (!result.ok) {
    return { ok: false, data: null, warnings: result.warnings, errorCode: result.errorCode, asOf: result.asOf };
  }
  return {
    ok: true,
    data: fn(result.data),
    warnings: result.warnings,
    asOf: result.asOf,
  };
}

export function flatMapResult<T, U>(
  result: AdapterResult<T>,
  fn: (data: T) => AdapterResult<U>,
): AdapterResult<U> {
  if (!result.ok) {
    return { ok: false, data: null, warnings: result.warnings, errorCode: result.errorCode, asOf: result.asOf };
  }
  const next = fn(result.data);
  next.warnings = [...result.warnings, ...next.warnings]; // accumulate warnings
  return next;
}

export function collectResults<T>(results: AdapterResult<T>[]): AdapterResult<T[]> {
  const errors = results.filter((r) => !r.ok);
  if (errors.length > 0) {
    const firstError = errors[0] as AdapterResult<T> & { ok: false };
    return {
      ok: false,
      data: null,
      warnings: results.flatMap((r) => r.warnings),
      errorCode: firstError.errorCode,
      asOf: new Date().toISOString(),
    };
  }
  return {
    ok: true,
    data: results.map((r) => (r as AdapterResult<T> & { ok: true }).data),
    warnings: results.flatMap((r) => r.warnings),
    asOf: new Date().toISOString(),
  };
}

export function collectPartialResults<T>(
  results: AdapterResult<T>[],
): { ok: true; data: T[]; warnings: AdapterWarning[]; asOf: string } {
  const okResults = results.filter((r) => r.ok) as (AdapterResult<T> & { ok: true })[];
  return {
    ok: true,
    data: okResults.map((r) => r.data),
    warnings: results.flatMap((r) => r.warnings),
    asOf: new Date().toISOString(),
  };
}

// ─── Null Adapter Factory ───────────────────────────────────────────────────

export function createNullAdapter<T>(): () => Promise<AdapterResult<T>> {
  return async () => adapterErr<T>('ADAPTER_UNAVAILABLE');
}

// ─── Warning Sanitization ───────────────────────────────────────────────────

export function sanitizeWarningsForPublic(warnings: AdapterWarning[]): AdapterWarning[] {
  return warnings.filter(
    (w) => w.code !== 'STALE_RESPOPSE'
      && !w.message?.includes('FALLBACK_VALUE')
      && !w.message?.includes('VERIFICATION_PENDING'),
  );
}

// ─── Safe Error Note ────────────────────────────────────────────────────────

const SAFE_ERROR_MESSAGES: Record<string, string> = {
  ADAPTER_UNAVAILABLE: 'Research data source is not yet available.',
  INVALID_SYMBOL: 'The ticker symbol could not be resolved.',
  EMPTY_RESPOPSE: 'No data was returned from the research source.',
  MALFORMED_RESPOPSE: 'The research data returned in an unexpected format.',
  STALE_RESPOPSE: 'The available research data may be outdated.',
  RATE_LIMITED: 'The research data source is temporarily busy.',
  UPSTREAM_REJECTED: 'The research request could not be completed.',
  UNKNOWN_ADAPTER_ERROR: 'An unexpected research data issue occurred.',
};

export function safeErrorNote(code: AdapterErrorCode): string {
  return SAFE_ERROR_MESSAGES[code] ?? SAFE_ERROR_MESSAGES['UNKNOWN_ADAPTER_ERROR'];
}
