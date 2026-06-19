import { NoteEngine } from "../portfolio/NoteEngine";
import { WatchlistEngine } from "../portfolio/WatchlistEngine";
import { PortfolioEngine } from "../portfolio/PortfolioEngine";
import { thesisSnapshotStore } from "../../lib/workspace/thesisSnapshotStore";
import { loadAuthSession } from "../auth/sessionStore";

export interface WorkspaceSummary {
  trackedCompanies: number;
  notesCount: number;
  portfolioPositions: number;
  trackedWithNotes: number;
  storageType: "local" | "account";
}

export class WorkspaceStateEngine {
  static getUserId(): string | null {
    const session = loadAuthSession();
    return session?.uid || null;
  }

  static getWorkspaceSummary(): WorkspaceSummary {
    const watchlists = WatchlistEngine.getWatchlists();
    const allTickers = new Set<string>();
    watchlists.forEach((w) => w.tickers.forEach((t) => allTickers.add(t)));

    const holdings = PortfolioEngine.getHoldings();

    let notesCount = 0;
    let trackedWithNotes = 0;
    allTickers.forEach((t) => {
      const note = NoteEngine.getNote(t);
      if (note && note.note && note.note.trim().length > 0) {
        notesCount++;
        if (allTickers.has(t)) trackedWithNotes++;
      }
    });

    return {
      trackedCompanies: allTickers.size,
      notesCount,
      portfolioPositions: holdings.length,
      trackedWithNotes,
      storageType: this.getUserId() ? "account" : "local",
    };
  }

  static clearWorkspace(): void {
    const watchlists = WatchlistEngine.getWatchlists();
    watchlists.forEach((w) => {
      w.tickers.forEach((t) => WatchlistEngine.removeTicker(w.id, t));
    });
    const holdings = PortfolioEngine.getHoldings();
    holdings.forEach((h) => PortfolioEngine.removeHolding(h.symbol));
    thesisSnapshotStore.clearAll();
  }

  static trackCompany(symbol: string): void {
    const watchlists = WatchlistEngine.getWatchlists();
    if (watchlists.length > 0) {
      const list = watchlists[0];
      if (!list.tickers.includes(symbol)) {
        WatchlistEngine.addTicker(list.id, symbol);
      }
    }
  }

  static untrackCompany(symbol: string): void {
    const watchlists = WatchlistEngine.getWatchlists();
    watchlists.forEach((w) => {
      if (w.tickers.includes(symbol)) {
        WatchlistEngine.removeTicker(w.id, symbol);
      }
    });
  }

  static isTracked(symbol: string): boolean {
    const watchlists = WatchlistEngine.getWatchlists();
    return watchlists.some((w) => w.tickers.includes(symbol));
  }

  static getCompanyWorkspaceState(symbol: string) {
    const note = NoteEngine.getNote(symbol);
    const snapshot = thesisSnapshotStore.getSnapshot(symbol);
    return {
      isTracked: this.isTracked(symbol),
      note: note.note || null,
      lastEdited: note.lastUpdated || null,
      snapshot,
      hasPriorSnapshot: snapshot !== null,
    };
  }
}
