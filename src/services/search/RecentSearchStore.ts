export class RecentSearchStore {
  private static STORAGE_KEY = "ss_recent_searches_v2";

  /**
   * Caches a recently opened ticker symbol. Keeps a maximum of 20 items (Section 137).
   */
  static addTicker(ticker: string): void {
    if (typeof window === "undefined") return;

    const t = ticker.toUpperCase().trim();
    if (!t) return;

    const list = this.getRecent();
    const index = list.indexOf(t);
    if (index !== -1) {
      list.splice(index, 1);
    }

    list.unshift(t);
    
    // Cap at exactly 20 items
    const capped = list.slice(0, 20);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(capped));
  }

  static getRecent(): string[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? (JSON.parse(data) as string[]) : [];
    } catch {
      return [];
    }
  }

  static clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
