export class StockCacheManager {
  private static cacheMap = new Map<string, any>();

  public static get(key: string): any | null {
    if (this.cacheMap.has(key)) {
      return this.cacheMap.get(key);
    }
    
    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(`ss_stock_cache_${key}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.cacheMap.set(key, parsed);
          return parsed;
        }
      } catch {
        // ignore
      }
    }
    return null;
  }

  public static set(key: string, value: any): void {
    this.cacheMap.set(key, value);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`ss_stock_cache_${key}`, JSON.stringify(value));
      } catch {
        // ignore
      }
    }
  }

  public static clear(): void {
    this.cacheMap.clear();
  }
}

export default StockCacheManager;
