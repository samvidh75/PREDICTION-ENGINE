/**
 * Rate Limiter Middleware — Fastify Plugin
 * F3.1B: route-family counters that ignore query-string variants.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitRule {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  reset?(): void | Promise<void>;
  shutdown?(): Promise<void>;
}

interface RedisRateLimitClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  ttl(key: string): Promise<number>;
  quit?(): Promise<unknown>;
  isOpen?: boolean;
}

export interface RateLimiterOptions {
  store?: RateLimitStore;
  redisUrl?: string;
  redisRequired?: boolean;
  singleInstanceAllowed?: boolean;
  nodeEnv?: string;
}

const ROUTE_FAMILIES: Record<string, string[]> = {
  'market-data': ['/api/market-data'],
  intelligence: ['/api/intelligence'],
  stockstory: ['/api/stockstory'],
  predictions: ['/api/predictions'],
  'admin-ingestion': ['/api/admin/ingestion'],
};

const FAMILY_RULES: Record<string, RateLimitRule> = {
  'market-data': { windowMs: 60_000, maxRequests: 30 },
  intelligence: { windowMs: 60_000, maxRequests: 20 },
  stockstory: { windowMs: 60_000, maxRequests: 20 },
  predictions: { windowMs: 60_000, maxRequests: 30 },
  'admin-ingestion': { windowMs: 60_000, maxRequests: 10 },
};

const DEFAULT_RULE: RateLimitRule = { windowMs: 60_000, maxRequests: 60 };

class InMemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, RateLimitEntry>();

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    let entry = this.entries.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 1, resetAt: now + windowMs };
      this.entries.set(key, entry);
      return entry;
    }

    entry.count++;
    return entry;
  }

  reset(): void {
    this.entries.clear();
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) {
      if (now > entry.resetAt + 60_000) this.entries.delete(key);
    }
  }
}

class RedisRateLimitStore implements RateLimitStore {
  constructor(private client: RedisRateLimitClient) {}

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const ttlSeconds = Math.max(1, Math.ceil(windowMs / 1_000));
    const count = await this.client.incr(key);
    if (count === 1) await this.client.expire(key, ttlSeconds);
    const ttl = await this.client.ttl(key);
    return {
      count,
      resetAt: Date.now() + Math.max(1, ttl) * 1_000,
    };
  }

  async shutdown(): Promise<void> {
    if (this.client.isOpen !== false && this.client.quit) {
      await this.client.quit();
    }
  }
}

const defaultMemoryStore = new InMemoryRateLimitStore();

function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function authenticatedIdentity(request: FastifyRequest): string | null {
  const user = (request as any).user;
  const userId = (request as any).userId ?? user?.id ?? user?.sub ?? null;
  return userId ? `user:${String(userId)}` : null;
}

function normalizePathname(url: string): string {
  return new URL(url, 'http://localhost').pathname.replace(/\/+$/g, '') || '/';
}

function matchRouteFamily(pathname: string): string {
  for (const [family, prefixes] of Object.entries(ROUTE_FAMILIES)) {
    if (prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))) return family;
  }
  return 'default';
}

function buildRateLimitKey(request: FastifyRequest, family: string): string {
  const identity = authenticatedIdentity(request) ?? `ip:${getClientIp(request)}`;
  return `ratelimit:${family}:${identity}`;
}

async function createRateLimitStore(opts: RateLimiterOptions): Promise<RateLimitStore> {
  if (opts.store) return opts.store;

  const nodeEnv = opts.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const redisUrl = opts.redisUrl ?? process.env.REDIS_URL;
  const redisRequired = opts.redisRequired ?? parseBoolean(process.env.RATE_LIMIT_REDIS_REQUIRED, false);
  const singleInstanceAllowed = opts.singleInstanceAllowed ?? parseBoolean(process.env.RATE_LIMIT_SINGLE_INSTANCE_ALLOWED, true);

  if (redisUrl) {
    const { createClient } = await import('redis');
    const client = createClient({ url: redisUrl });
    client.on('error', () => {
      // Connection errors surface during commands; avoid logging sensitive URLs.
    });
    try {
      await client.connect();
    } catch (error) {
      if (redisRequired) throw new Error(`Rate limiter Redis unavailable: ${safeRedisError(error)}`);
      return defaultMemoryStore;
    }
    return new RedisRateLimitStore(client as unknown as RedisRateLimitClient);
  }

  if (redisRequired && !singleInstanceAllowed) {
    throw new Error('Rate limiter configuration error: REDIS_URL is required for multi-replica production rate limiting.');
  }

  return defaultMemoryStore;
}

async function rateLimiterPluginImpl(app: FastifyInstance, opts: RateLimiterOptions = {}): Promise<void> {
  const store = await createRateLimitStore(opts);

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const pathname = normalizePathname(request.url);
    const family = matchRouteFamily(pathname);
    const rule = FAMILY_RULES[family] ?? DEFAULT_RULE;
    const key = buildRateLimitKey(request, family);
    const entry = await store.increment(key, rule.windowMs);
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1_000));

    reply.header('X-RateLimit-Limit', rule.maxRequests);
    reply.header('X-RateLimit-Remaining', Math.max(0, rule.maxRequests - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1_000));

    if (entry.count > rule.maxRequests) {
      reply.code(429).header('Retry-After', retryAfter);
      return reply.send({
        error: 'Rate limit exceeded',
        retryAfterSeconds: retryAfter,
        family,
      });
    }
  });

  const cleanupInterval = setInterval(() => {
    if (store instanceof InMemoryRateLimitStore) store.cleanup();
  }, 300_000);
  cleanupInterval.unref?.();

  app.addHook('onClose', async () => {
    clearInterval(cleanupInterval);
    await store.shutdown?.();
  });
}

export const rateLimiterPlugin = fp(rateLimiterPluginImpl, { name: 'rate-limiter' });

export function createInMemoryRateLimitStoreForTests(): RateLimitStore {
  return new InMemoryRateLimitStore();
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === '') return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

function safeRedisError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/redis:\/\/[^@\s]+@/gi, 'redis://[REDACTED]@');
  }
  return 'unknown connection error';
}

export default rateLimiterPlugin;
