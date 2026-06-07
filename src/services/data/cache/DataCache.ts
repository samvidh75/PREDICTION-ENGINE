// src/services/data/cache/DataCache.ts

export class DataCache {
  private static memoryCache: Map<string, { value: any; expiry: number }> = new Map();

  public static get<T>(key: string): T | null {
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem) {
      if (Date.now() < memoryItem.expiry) {
        return memoryItem.value as T;
      }
      this.memoryCache.delete(key);
    }

    try {
      if (typeof window !== 'undefined') {
        const stored = sessionStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Date.now() < parsed.expiry) {
            // Restore to memory cache for fast retrieval next time
            this.memoryCache.set(key, { value: parsed.value, expiry: parsed.expiry });
            return parsed.value as T;
          }
          sessionStorage.removeItem(key);
        }
      }
    } catch {
      // safe fallback
    }

    return null;
  }

  public static set<T>(key: string, value: T, ttlMs: number): void {
    const expiry = Date.now() + ttlMs;
    this.memoryCache.set(key, { value, expiry });

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(key, JSON.stringify({ value, expiry }));
      }
    } catch {
      // safe fallback
    }
  }

  public static remove(key: string): void {
    this.memoryCache.delete(key);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(key);
      }
    } catch {
      // safe fallback
    }
  }

  public static clear(): void {
    this.memoryCache.clear();
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.clear();
      }
    } catch {
      // safe fallback
    }
  }
}
