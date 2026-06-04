// src/services/portfolio/NoteEngine.ts

export interface ResearchNote {
  symbol: string;
  note: string;
  lastUpdated: string;
}

export class NoteEngine {
  private static notes: Record<string, ResearchNote> = {
    RELIANCE: { symbol: "RELIANCE", note: "Watch Q4 earnings. Monitor retail growth margins.", lastUpdated: "Yesterday" },
    HAL: { symbol: "HAL", note: "Monitor defence budget allocations and export delivery speeds.", lastUpdated: "2 days ago" },
  };

  public static getNote(symbol: string): ResearchNote {
    return this.notes[symbol.toUpperCase()] || { symbol, note: "", lastUpdated: "Never" };
  }

  public static saveNote(symbol: string, note: string): void {
    const sym = symbol.toUpperCase();
    this.notes[sym] = {
      symbol: sym,
      note,
      lastUpdated: "Just now",
    };
  }
}
