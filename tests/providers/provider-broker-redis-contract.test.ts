import { afterAll, describe, expect, it } from 'vitest';
import { createClient } from 'redis';
import { RedisProviderBrokerStore, type ProviderBrokerRedisClient } from '../../src/services/providers/broker/RedisProviderBrokerStore';
import { assertProviderBrokerConfig, loadProviderBrokerConfig } from '../../src/services/providers/broker/config';

class FakeRedisClient implements ProviderBrokerRedisClient {
  values = new Map<string, string>();
  expiries = new Map<string, number>();

  async incr(key: string): Promise<number> {
    const next = Number(this.values.get(key) ?? '0') + 1;
    this.values.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    this.expiries.set(key, seconds);
    return true;
  }

  async ttl(key: string): Promise<number> {
    return this.expiries.get(key) ?? -1;
  }

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: string, options?: { EX?: number; NX?: boolean }): Promise<string | null> {
    if (options?.NX && this.values.has(key)) return null;
    this.values.set(key, value);
    if (options?.EX) this.expiries.set(key, options.EX);
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = this.values.delete(key);
    this.expiries.delete(key);
    return existed ? 1 : 0;
  }
}

let realClient: ReturnType<typeof createClient> | null = null;

async function redisClient(): Promise<ProviderBrokerRedisClient> {
  if (!process.env.REDIS_URL) return new FakeRedisClient();

  realClient = createClient({ url: process.env.REDIS_URL });
  await realClient.connect();
  await realClient.flushDb();
  return realClient as unknown as ProviderBrokerRedisClient;
}

describe('provider broker Redis contract', () => {
  afterAll(async () => {
    if (realClient) {
      await realClient.quit();
      realClient = null;
    }
  });

  it('uses provider-broker namespaced keys only', async () => {
    const store = new RedisProviderBrokerStore(process.env.REDIS_URL ?? 'redis://test', await redisClient());

    expect(store.key('quota', 'FinnHub', 'minute')).toBe('provider-broker:quota:finnhub:minute');
    expect(store.key('cooldown', 'FinnHub')).toBe('provider-broker:cooldown:finnhub');
    expect(store.key('cache', 'quote:RELIANCE')).toBe('provider-broker:cache:quote_reliance');
    expect(store.key('negative', 'abc123')).toBe('provider-broker:negative:abc123');
    expect(store.key('lock', 'quote/RELIANCE')).toBe('provider-broker:lock:quote_reliance');
    expect(store.key('run', 'run-123')).toBe('provider-broker:run:run-123');
  });

  it('applies TTL to quota, cooldown, and negative-cache keys', async () => {
    const client = await redisClient();
    const store = new RedisProviderBrokerStore(process.env.REDIS_URL ?? 'redis://test', client);

    await store.incrementQuotaCounter('finnhub', 'minute', 60);
    await store.setCooldown('finnhub', 5_000);
    await store.setNegativeCache('hash123', 30_000);

    expect(await client.ttl(store.key('quota', 'finnhub', 'minute'))).toBeGreaterThan(0);
    expect(await client.ttl(store.key('cooldown', 'finnhub'))).toBeGreaterThan(0);
    expect(await client.ttl(store.key('negative', 'hash123'))).toBeGreaterThan(0);
  });

  it('acquires and releases distributed locks by owner', async () => {
    const store = new RedisProviderBrokerStore(process.env.REDIS_URL ?? 'redis://test', await redisClient());

    await expect(store.acquireLock('quote:RELIANCE', 'owner-a', 5_000)).resolves.toBe(true);
    await expect(store.acquireLock('quote:RELIANCE', 'owner-b', 5_000)).resolves.toBe(false);
    await expect(store.releaseLock('quote:RELIANCE', 'owner-b')).resolves.toBe(false);
    await expect(store.releaseLock('quote:RELIANCE', 'owner-a')).resolves.toBe(true);
    await expect(store.acquireLock('quote:RELIANCE', 'owner-b', 5_000)).resolves.toBe(true);
  });

  it('fails closed when Redis is required but unavailable', () => {
    const config = loadProviderBrokerConfig({
      NODE_ENV: 'production',
      PROVIDER_BROKER_ENABLED: 'true',
      PROVIDER_BROKER_REDIS_REQUIRED: 'true',
      PROVIDER_BROKER_SINGLE_INSTANCE_ALLOWED: 'false',
    });

    expect(() => assertProviderBrokerConfig(config)).toThrow(/REDIS_URL is required/);
  });
});
