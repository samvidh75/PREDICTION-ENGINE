// src/services/portfolio/NoteEngine.ts

export interface ResearchNote {
  symbol: string;
  note: string;
  lastUpdated: string;
  timestamp?: number;
}

export class NoteEngine {
  private static getNotesMap(): Record<string, ResearchNote> {
    const defaultNotes: Record<string, ResearchNote> = {};
    if (typeof window === "undefined") return defaultNotes;
    const raw = localStorage.getItem("stockstory_watchlist_notes_v1");
    if (!raw) {
      localStorage.setItem("stockstory_watchlist_notes_v1", JSON.stringify(defaultNotes));
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
      lastUpdated: new Date().toLocaleDateString(),
      timestamp: Date.now()
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("stockstory_watchlist_notes_v1", JSON.stringify(map));
      window.dispatchEvent(new Event("watchlistchange"));
    }
  }
}
