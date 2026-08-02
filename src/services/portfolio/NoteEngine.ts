// src/services/portfolio/NoteEngine.ts

export interface ResearchNote {
  symbol: string;
  note: string;
  lastUpdated: string;
  timestamp?: number;
}

function getStorageKey(): string {
  const uid = getUserId();
  return uid ? `stockstory_watchlist_notes_v1_${uid}` : "stockstory_watchlist_notes_v1";
}

function getUserId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ss_auth_session_v1");
    if (raw) {
      const session = JSON.parse(raw);
      return session.uid || null;
    }
  } catch {
    // ignore
  }
  return null;
}

export class NoteEngine {
  private static getNotesMap(): Record<string, ResearchNote> {
    const defaultNotes: Record<string, ResearchNote> = {};
    if (typeof window === "undefined") return defaultNotes;
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultNotes));
      return defaultNotes;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  public static getNote(symbol: string): ResearchNote {
    const map = this.getNotesMap();
    return map[symbol.toUpperCase()] || { symbol, note: "", lastUpdated: "Never", timestamp: 0 };
  }

  public static saveNote(symbol: string, note: string): void {
    const sym = symbol.toUpperCase();
    const map = this.getNotesMap();
    map[sym] = {
      symbol: sym,
      note,
      lastUpdated: new Date().toISOString(),
      timestamp: Date.now()
    };
    if (typeof window !== "undefined") {
      const key = getStorageKey();
      localStorage.setItem(key, JSON.stringify(map));
      window.dispatchEvent(new Event("watchlistchange"));
    }
  }

  public static clearAll(): void {
    if (typeof window !== "undefined") {
      const key = getStorageKey();
      localStorage.removeItem(key);
      window.dispatchEvent(new Event("watchlistchange"));
    }
  }
}
