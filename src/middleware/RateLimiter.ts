/**
 * Rate Limiter Middleware — Fastify Plugin
 * TRACK-65 AGENT F | Rewired for Fastify TRACK-68
 *
 * Production-grade rate limiting with per-IP tracking + configurable route rules.
 * Uses in-memory Map (suitable for single-process Fastify; upgrade to Redis for multi-instance).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

const defaultRules: Record<string, RateLimitRule> = {
  '/api/stockstory': { windowMs: 60_000, maxRequests: 30 },
  '/api/predictions': { windowMs: 60_000, maxRequests: 30 },
  '/api/watchlist': { windowMs: 60_000, maxRequests: 20 },
  '/api/intelligence': { windowMs: 60_000, maxRequests: 20 },
  '/api/auth': { windowMs: 60_000, maxRequests: 10 },
  default: { windowMs: 60_000, maxRequests: 60 },
};

const requestCounts = new Map<string, RateLimitEntry>();
const blockedIps = new Map<string, number>();

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function matchRule(path: string, rules: Record<string, RateLimitRule>): RateLimitRule {
  for (const [prefix, rule] of Object.entries(rules)) {
    if (prefix === 'default') continue;
    if (path.startsWith(prefix)) return rule;
  }
  return rules['default'] || { windowMs: 60_000, maxRequests: 60 };
}

/**
 * Register the rate limiter as a Fastify plugin.
 * Attaches an onRequest hook that enforces per-IP + per-route limits.
 */
export async function rateLimiterPlugin(app: FastifyInstance, _opts: Record<string, unknown> = {}): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = getClientIp(request);
    const rule = matchRule(request.url, defaultRules);
    const key = `${ip}:${request.url}`;
    const now = Date.now();

    // Check if IP is temporarily blocked
    const blockedUntil = blockedIps.get(ip);
    if (blockedUntil && now < blockedUntil) {
      reply.code(429).header('retry-after', Math.ceil((blockedUntil - now) / 1000));
      return reply.send({ error: 'Too many requests. Please wait before retrying.' });
    }

    // Get or create rate limit entry
    let entry = requestCounts.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + rule.windowMs };
      requestCounts.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', rule.maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, rule.maxRequests - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    // Enforce limit
    if (entry.count > rule.maxRequests) {
      // Block IP for 5 minutes if they exceed limit by 2x
      if (entry.count > rule.maxRequests * 2) {
        blockedIps.set(ip, now + 300_000);
      }
      reply.code(429);
      return reply.send({ error: 'Rate limit exceeded. Slow down.' });
    }
  });

  // Periodic cleanup of stale entries (every 5 minutes)
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requestCounts) {
      if (now > entry.resetAt + 60_000) {
        requestCounts.delete(key);
      }
    }
    for (const [ip, until] of blockedIps) {
      if (now > until) {
        blockedIps.delete(ip);
      }
    }
  }, 300_000);

  // Prevent timer from keeping the process alive
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }
}

/**
 * Programmatic IP blocking (exposed for abuse prevention integrations).
 */
export function blockIp(ip: string, ms: number): void {
  blockedIps.set(ip, Date.now() + ms);
}

/**
 * Check if an IP is currently blocked.
 */
export function isIpBlocked(ip: string): boolean {
  return (blockedIps.get(ip) || 0) > Date.now();
}

export default rateLimiterPlugin;
