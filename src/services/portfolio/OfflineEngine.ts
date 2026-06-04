// src/services/portfolio/OfflineEngine.ts

export class OfflineEngine {
  private static isOfflineMode: boolean = false;

  public static isOffline(): boolean {
    return this.isOfflineMode;
  }

  public static toggleOffline(val: boolean): void {
    this.isOfflineMode = val;
  }

  public static cacheAssetData(symbol: string, data: any): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(`offline_cache_${symbol.toUpperCase()}`, JSON.stringify(data));
  }

  public static getCachedAssetData(symbol: string): any | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(`offline_cache_${symbol.toUpperCase()}`);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
