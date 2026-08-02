type CacheEntry = { value: string; expiresAt: number };

const store = new Map<string, CacheEntry>();

export class CacheService {
  async get(key: string): Promise<string | null> {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  async del(key: string): Promise<void> {
    store.delete(key);
  }

  async clear(): Promise<void> {
    store.clear();
  }

  size(): number {
    return store.size;
  }
}

export const cacheService = new CacheService();
