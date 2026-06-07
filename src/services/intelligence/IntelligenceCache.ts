// src/services/intelligence/IntelligenceCache.ts

export class IntelligenceCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();
  private ttlMs = 5 * 60 * 1000; // 5 minutes

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: any): void {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const intelligenceCache = new IntelligenceCache();
export default intelligenceCache;
