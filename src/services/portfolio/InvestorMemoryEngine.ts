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

export interface InvestorPreferences {
  minROE?: number;
  maxDE?: number;
  favouredSectors: string[];
  avoidedSectors: string[];
  style?: 'value' | 'growth' | 'momentum' | 'dividend' | 'contrarian';
  holdingPeriod?: 'short' | 'medium' | 'long';
  convictionThreshold?: number;
}

export interface PastDecision {
  id: string;
  symbol: string;
  decision: 'added' | 'exited' | 'increased' | 'reduced' | 'watched';
  rationale: string;
  outcome?: string;
  date: string;
}

export interface Learning {
  id: string;
  category: 'sector' | 'indicator' | 'event' | 'risk' | 'behaviour';
  insight: string;
  date: string;
}

export interface MemoryData {
  savedCompanies: string[];
  savedSectors: string[];
  savedStories: SavedStory[];
  savedInsights: SavedInsight[];
  savedSearches: string[];
  recentActivity: ActivityLog[];
  preferences: InvestorPreferences;
  pastDecisions: PastDecision[];
  learnings: Learning[];
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
  ],
  preferences: {
    favouredSectors: ["Defense", "Banking"],
    avoidedSectors: [],
    style: 'growth',
    holdingPeriod: 'medium',
  },
  pastDecisions: [],
  learnings: [],
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
        // Only hydrate from the backend if nothing local exists yet — this
        // fire-and-forget sync can resolve arbitrarily late (well after
        // page load), and unconditionally overwriting would clobber any
        // local writes that happened in the meantime.
        const key = this.getStorageKey();
        if (window.localStorage.getItem(key)) return;
        if (state && state.memory && Object.keys(state.memory).length > 0) {
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

  // Preferences
  public static updatePreferences(prefs: Partial<InvestorPreferences>): void {
    const mem = this.getMemory();
    mem.preferences = { ...mem.preferences, ...prefs };
    this.logActivity('Updated investor preferences');
    this.saveMemory(mem);
  }

  public static addFavouredSector(sector: string): void {
    const mem = this.getMemory();
    const s = sector.trim();
    if (!mem.preferences.favouredSectors.includes(s)) {
      mem.preferences.favouredSectors.push(s);
      mem.preferences.avoidedSectors = mem.preferences.avoidedSectors.filter(x => x !== s);
      this.saveMemory(mem);
    }
  }

  public static addAvoidedSector(sector: string): void {
    const mem = this.getMemory();
    const s = sector.trim();
    if (!mem.preferences.avoidedSectors.includes(s)) {
      mem.preferences.avoidedSectors.push(s);
      mem.preferences.favouredSectors = mem.preferences.favouredSectors.filter(x => x !== s);
      this.saveMemory(mem);
    }
  }

  // Past Decisions
  public static recordDecision(symbol: string, decision: PastDecision['decision'], rationale: string): void {
    const mem = this.getMemory();
    mem.pastDecisions.push({
      id: `d_${Date.now()}`,
      symbol: symbol.toUpperCase().trim(),
      decision,
      rationale,
      date: new Date().toISOString().split('T')[0],
    });
    mem.pastDecisions = mem.pastDecisions.slice(-50);
    this.logActivity(`Decision recorded: ${decision} ${symbol}`);
    this.saveMemory(mem);
  }

  public static getDecisionsForSymbol(symbol: string): PastDecision[] {
    const mem = this.getMemory();
    const sym = symbol.toUpperCase().trim();
    return mem.pastDecisions.filter(d => d.symbol === sym).sort((a, b) => b.date.localeCompare(a.date));
  }

  // Learnings
  public static addLearning(category: Learning['category'], insight: string): void {
    const mem = this.getMemory();
    mem.learnings.push({
      id: `l_${Date.now()}`,
      category,
      insight,
      date: new Date().toISOString().split('T')[0],
    });
    mem.learnings = mem.learnings.slice(-30);
    this.logActivity(`Added learning: ${insight.substring(0, 50)}`);
    this.saveMemory(mem);
  }

  public static getLearningsByCategory(category: Learning['category']): Learning[] {
    const mem = this.getMemory();
    return mem.learnings.filter(l => l.category === category)
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  public static updateDecisionOutcome(decisionId: string, outcome: string): void {
    const mem = this.getMemory();
    const decision = mem.pastDecisions.find(d => d.id === decisionId);
    if (decision) {
      decision.outcome = outcome;
      this.saveMemory(mem);
    }
  }
}
export default InvestorMemoryEngine;
