import { InMemoryProviderBrokerStore } from './InMemoryProviderBrokerStore';

type RedisSetOptions = { EX?: number; NX?: boolean };

export interface ProviderBrokerRedisClient {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number | boolean>;
  ttl(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options?: RedisSetOptions): Promise<string | null>;
  del(key: string): Promise<number>;
}

/**
 * Redis-selected provider broker store.
 *
 * The current broker store surface is synchronous because provider execution
 * already carries the async single-flight promise. Until the distributed store
 * interface lands, this class is the explicit Redis-configured store boundary
 * and fail-closed marker used by the factory.
 */
export class RedisProviderBrokerStore extends InMemoryProviderBrokerStore {
  readonly redisUrl: string;
  private readonly client?: ProviderBrokerRedisClient;

  constructor(redisUrl: string, client?: ProviderBrokerRedisClient) {
    super();
    if (!redisUrl) {
      throw new Error('RedisProviderBrokerStore requires REDIS_URL.');
    }
    this.redisUrl = redisUrl;
    this.client = client;
  }

  key(namespace: 'quota' | 'cooldown' | 'cache' | 'negative' | 'lock' | 'run', ...parts: string[]): string {
    return `provider-broker:${namespace}:${parts.map(part => this.sanitizeKeyPart(part)).join(':')}`;
  }

  async incrementQuotaCounter(provider: string, window: 'minute' | 'day' | 'burst', ttlSeconds: number): Promise<number> {
    const client = this.requireClient();
    const key = this.key('quota', provider, window);
    const count = await client.incr(key);
    await client.expire(key, ttlSeconds);
    return count;
  }

  async setCooldown(provider: string, retryAfterMs: number): Promise<void> {
    const client = this.requireClient();
    const ttlSeconds = this.msToSeconds(retryAfterMs);
    await client.set(this.key('cooldown', provider), String(Date.now() + retryAfterMs), { EX: ttlSeconds });
  }

  async setNegativeCache(keyHash: string, ttlMs: number): Promise<void> {
    const client = this.requireClient();
    await client.set(this.key('negative', keyHash), '1', { EX: this.msToSeconds(ttlMs) });
  }

  async acquireLock(lockName: string, owner: string, ttlMs: number): Promise<boolean> {
    const client = this.requireClient();
    const result = await client.set(this.key('lock', lockName), owner, { EX: this.msToSeconds(ttlMs), NX: true });
    return result === 'OK';
  }

  async releaseLock(lockName: string, owner: string): Promise<boolean> {
    const client = this.requireClient();
    const key = this.key('lock', lockName);
    const currentOwner = await client.get(key);
    if (currentOwner !== owner) return false;
    await client.del(key);
    return true;
  }

  async ttl(namespace: 'quota' | 'cooldown' | 'negative' | 'lock', ...parts: string[]): Promise<number> {
    return this.requireClient().ttl(this.key(namespace, ...parts));
  }

  private requireClient(): ProviderBrokerRedisClient {
    if (!this.client) {
      throw new Error('RedisProviderBrokerStore client is not connected.');
    }
    return this.client;
  }

  private msToSeconds(ms: number): number {
    return Math.max(1, Math.ceil(ms / 1_000));
  }

  private sanitizeKeyPart(part: string): string {
    return part.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '_');
  }
}
