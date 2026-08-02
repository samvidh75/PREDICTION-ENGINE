/**
 * Serverless-safe cache for Vercel API functions (api/*.ts).
 *
 * These functions are stateless and cold-start per invocation, so they
 * can't share the in-process cache pattern the always-on Fastify server
 * uses (see src/config/redis.ts, which wraps the standard `redis` package
 * over a persistent TCP connection — correct for that server, wrong here:
 * opening a new TCP connection per serverless invocation is the exact
 * anti-pattern Upstash's REST-based client exists to avoid).
 *
 * Falls back to a per-instance in-memory Map when UPSTASH_REDIS_REST_URL /
 * UPSTASH_REDIS_REST_TOKEN aren't set (local dev, or any sandbox without
 * outbound access to Upstash) — callers get shorter-lived, per-instance
 * caching instead of a hard failure.
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  redisClient = url && token ? new Redis({ url, token }) : null;
  return redisClient;
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

const memoryFallback = new Map<string, MemoryEntry>();

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get<T>(key);
      return value ?? null;
    } catch (err) {
      console.error(`[serverlessCache] Upstash GET failed for "${key}":`, err);
      // fall through to memory fallback below
    }
  }

  const entry = memoryFallback.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    memoryFallback.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    } catch (err) {
      console.error(`[serverlessCache] Upstash SET failed for "${key}":`, err);
      // fall through to memory fallback below
    }
  }

  memoryFallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

/** True when Upstash is actually configured (vs. running on the in-memory fallback). */
export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
