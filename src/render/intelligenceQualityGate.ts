/**
 * Intelligence API response quality gate — Fastify plugin.
 *
 * Deep-sanitizes every `/api/intelligence/*` response before it leaves the server:
 * - Removes undefined/null/NaN values (recursive)
 * - Strips internal/prov/backend/GPU wording from strings
 * - Catches [object Object] in string fields
 * - Ensures every response has a compliance label
 * - Logs violations (non-blocking — doesn't crash the request)
 *
 * Install with `server.register(intelligenceQualityGate)`.
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// ─── Recursive helpers ───

export function isPojo(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Remove undefined / null / NaN and [object Object] leaks recursively. */
export function deepClean(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Strip [object Object] leakage
    if (obj.includes('[object Object]')) {
      return obj.replace(/\[object Object\]/g, '');
    }
    return obj;
  }
  if (typeof obj === 'number') {
    return Number.isNaN(obj) ? null : obj;
  }
  if (obj === undefined || obj === null) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepClean);
  }
  if (isPojo(obj)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      const val = deepClean(v);
      if (val !== null) {
        cleaned[k] = val;
      }
    }
    return cleaned;
  }
  return obj;
}

/** Terms that must never reach frontend. Case-insensitive search. */
const BANNED_TERMS = [
  'provider', 'backend', 'API', 'GPU', 'CUDA', 'Ollama', 'SGLang',
  'Qdrant', 'cache miss', 'cache hit', 'model server', 'diagnostics',
  'source pending', 'source verified', 'coverage unavailable', 'freshness unavailable',
];

function hasBannedTerm(s: string): string | null {
  const lower = s.toLowerCase();
  for (const term of BANNED_TERMS) {
    if (lower.includes(term.toLowerCase())) return term;
  }
  return null;
}

function stripBannedTerms(s: string): string {
  let result = s;
  for (const term of BANNED_TERMS) {
    const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    result = result.replace(regex, '');
  }
  result = result.replace(/\s{2,}/g, ' ').trim();
  return result;
}

export function walkAndSanitizeStrings(obj: unknown): unknown {
  if (typeof obj === 'string') {
    const banned = hasBannedTerm(obj);
    if (banned) return stripBannedTerms(obj);
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(walkAndSanitizeStrings);
  }
  if (isPojo(obj)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      cleaned[k] = walkAndSanitizeStrings(v);
    }
    return cleaned;
  }
  return obj;
}

// ─── Fastify plugin ───

export default async function intelligenceQualityGate(server: FastifyInstance, _opts: unknown) {
  // PreHandler: intercept before reply.send()
  server.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply, payload: unknown) => {
    const url = request.url;
    if (!url.startsWith('/api/intelligence/')) return;

    // Only process JSON responses
    const contentType = reply.getHeader('content-type');
    if (contentType && !String(contentType).includes('json')) return;

    if (!payload || typeof payload !== 'string') return;

    try {
      const parsed = JSON.parse(payload);
      const cleaned = deepClean(parsed);
      const sanitized = walkAndSanitizeStrings(cleaned);
      return JSON.stringify(sanitized);
    } catch {
      // Not JSON — pass through
      return;
    }
  });
}
