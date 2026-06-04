// src/services/portfolio/InvestorMemoryEngine.ts
import { loadAuthSession } from "../auth/sessionStore";

export interface SavedStory {
  ticker: string;
  title: string;
  addedAt: string;
}

export interface SavedInsight {
  id: string;
  title: string;
  addedAt: string;
}

export interface ActivityLog {
  action: string;
  timestamp: string;
}

export interface MemoryData {
  savedCompanies: string[];
  savedSectors: string[];
  savedStories: SavedStory[];
  savedInsights: SavedInsight[];
  savedSearches: string[];
  recentActivity: ActivityLog[];
}

const STORAGE_KEY_PREFIX = "stockstory_memory_v2";

const DEFAULT_MEMORY: MemoryData = {
  savedCompanies: ["RELIANCE", "HAL"],
  savedSectors: ["Defense", "Banking"],
  savedStories: [
    { ticker: "RELIANCE", title: "Reliance Telecom Expansion Catalyst", addedAt: "Yesterday" }
  ],
  savedInsights: [
    { id: "i1", title: "HAL Momentum Breakout Confirmations", addedAt: "2 days ago" }
  ],
  savedSearches: ["Reliance", "HDFC Bank", "HAL"],
  recentActivity: [
    { action: "Logged in from Chrome", timestamp: "10 mins ago" },
    { action: "Updated Portfolio Weights", timestamp: "30 mins ago" },
    { action: "Added HAL to Defense Watchlist", timestamp: "Yesterday" }
  ]
};

export class InvestorMemoryEngine {
  private static getStorageKey(): string {
    const uid = loadAuthSession().uid || "anonymous";
    return `${STORAGE_KEY_PREFIX}_${uid}`;
  }

  private static isInitialSyncStarted = false;

  private static syncMemoryWithBackend(): void {
    if (typeof window === "undefined") return;
    const uid = loadAuthSession().uid || "anonymous";
    
    fetch(`/api/investor-state?uid=${uid}`)
      .then(res => res.json())
      .then((state: any) => {
        if (state && state.memory && Object.keys(state.memory).length > 0) {
          const key = this.getStorageKey();
          window.localStorage.setItem(key, JSON.stringify(state.memory));
          window.dispatchEvent(new Event("memorychange"));
        }
      })
      .catch(() => {});
  }

  public static getMemory(): MemoryData {
    if (typeof window === "undefined") return DEFAULT_MEMORY;

    if (!this.isInitialSyncStarted) {
      this.isInitialSyncStarted = true;
      this.syncMemoryWithBackend();
    }

    const key = this.getStorageKey();
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(DEFAULT_MEMORY));
      return DEFAULT_MEMORY;
    }
    try {
      return JSON.parse(raw) as MemoryData;
    } catch {
      return DEFAULT_MEMORY;
    }
  }

  public static saveMemory(data: MemoryData): void {
    if (typeof window === "undefined") return;
    const key = this.getStorageKey();
    window.localStorage.setItem(key, JSON.stringify(data));
    window.dispatchEvent(new Event("memorychange"));

    // Async sync to backend
    const uid = loadAuthSession().uid || "anonymous";
    fetch(`/api/investor-state?uid=${uid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memory: data })
    }).catch(() => {});
  }

  // Saved Companies
  public static saveCompany(symbol: string): void {
    const mem = this.getMemory();
    const sym = symbol.toUpperCase().trim();
    if (!mem.savedCompanies.includes(sym)) {
      mem.savedCompanies.push(sym);
      this.logActivity(`Saved company ${sym}`);
      this.saveMemory(mem);
    }
  }

  public static unsaveCompany(symbol: string): void {
    const mem = this.getMemory();
    const sym = symbol.toUpperCase().trim();
    mem.savedCompanies = mem.savedCompanies.filter(s => s !== sym);
    this.logActivity(`Removed company ${sym} from bookmarks`);
    this.saveMemory(mem);
  }

  // Saved Sectors
  public static saveSector(sector: string): void {
    const mem = this.getMemory();
    const sec = sector.trim();
    if (!mem.savedSectors.includes(sec)) {
      mem.savedSectors.push(sec);
      this.logActivity(`Saved sector ${sec}`);
      this.saveMemory(mem);
    }
  }

  public static unsaveSector(sector: string): void {
    const mem = this.getMemory();
    const sec = sector.trim();
    mem.savedSectors = mem.savedSectors.filter(s => s !== sec);
    this.logActivity(`Removed sector ${sec} from bookmarks`);
    this.saveMemory(mem);
  }

  // Saved Stories
  public static saveStory(ticker: string, title: string): void {
    const mem = this.getMemory();
    const sym = ticker.toUpperCase().trim();
    if (!mem.savedStories.some(s => s.ticker === sym)) {
      mem.savedStories.push({ ticker: sym, title, addedAt: "Just now" });
      this.logActivity(`Saved research story for ${sym}`);
      this.saveMemory(mem);
    }
  }

  // Saved Insights
  public static saveInsight(id: string, title: string): void {
    const mem = this.getMemory();
    if (!mem.savedInsights.some(i => i.id === id)) {
      mem.savedInsights.push({ id, title, addedAt: "Just now" });
      this.logActivity(`Bookmarked insight: "${title}"`);
      this.saveMemory(mem);
    }
  }

  // Saved Searches
  public static addSearch(query: string): void {
    const mem = this.getMemory();
    const q = query.trim();
    if (!q) return;
    mem.savedSearches = [q, ...mem.savedSearches.filter(s => s.toLowerCase() !== q.toLowerCase())].slice(0, 10);
    this.saveMemory(mem);
  }

  // Activity Logs
  public static logActivity(action: string): void {
    const mem = this.getMemory();
    mem.recentActivity = [{ action, timestamp: "Just now" }, ...mem.recentActivity].slice(0, 20);
    this.saveMemory(mem);
  }
}
export default InvestorMemoryEngine;
