import { loadAuthSession } from "../auth/sessionStore";

export interface ThesisSnapshot {
  symbol: string;
  score: number | null;
  label: string | null;
  confidence: number | null;
  timestamp: string;
  factors: Record<string, number | null>;
}

function getStorageKey(): string {
  const session = loadAuthSession();
  const uid = session?.uid || "anonymous";
  return `stockstory_thesis_snapshots_v1_${uid}`;
}

export class ThesisSnapshotEngine {
  static getSnapshots(): Record<string, ThesisSnapshot[]> {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(getStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  static getSnapshot(symbol: string): ThesisSnapshot | null {
    const all = this.getSnapshots();
    const snaps = all[symbol.toUpperCase()];
    if (!snaps || snaps.length === 0) return null;
    return snaps[snaps.length - 1];
  }

  static saveSnapshot(snapshot: ThesisSnapshot): void {
    const sym = snapshot.symbol.toUpperCase();
    const all = this.getSnapshots();
    if (!all[sym]) all[sym] = [];
    all[sym].push({ ...snapshot, symbol: sym });
    if (typeof window !== "undefined") {
      localStorage.setItem(getStorageKey(), JSON.stringify(all));
    }
  }

  static hasChanged(symbol: string, currentScore: number | null): boolean {
    const prev = this.getSnapshot(symbol);
    if (!prev) return false;
    return prev.score !== currentScore;
  }

  static getChangeLabel(symbol: string): string | null {
    const prev = this.getSnapshot(symbol);
    if (!prev) return "Tracking begins now";
    return null; // no change detected
  }

  static clearAll(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(getStorageKey());
    }
  }
}
