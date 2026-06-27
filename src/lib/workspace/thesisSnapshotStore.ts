import type { ThesisSnapshot, ResearchChangeEvent } from "./workspaceModels";
import { changeDetection } from "./changeDetection";

function storageKey(uid: string | null): string {
  const suffix = uid ? uid : "anon";
  return `stockstory_thesis_snapshots_v1_${suffix}`;
}

function loadUid(): string | null {
  try {
    const raw = localStorage.getItem("ss_auth_session_v1");
    if (!raw) return null;
    const session = JSON.parse(raw);
    return session.uid ?? null;
  } catch {
    return null;
  }
}

export const thesisSnapshotStore = {
  getSnapshots(): Record<string, ThesisSnapshot> {
    const uid = loadUid();
    try {
      const raw = localStorage.getItem(storageKey(uid));
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  getSnapshot(symbol: string): ThesisSnapshot | null {
    return this.getSnapshots()[symbol.toUpperCase()] ?? null;
  },

  saveSnapshot(snapshot: ThesisSnapshot): void {
    const uid = loadUid();
    const key = snapshot.symbol.toUpperCase();
    const all = this.getSnapshots();
    all[key] = snapshot;
    try {
      localStorage.setItem(storageKey(uid), JSON.stringify(all));
      window.dispatchEvent(new CustomEvent("snapshotchange", { detail: { symbol: key } }));
    } catch {/* silent */}
  },

  detectChanges(snapshot: ThesisSnapshot): ResearchChangeEvent[] {
    const prior = this.getSnapshot(snapshot.symbol);
    return changeDetection.detectChanges(prior, snapshot);
  },

  clearAll(): void {
    const uid = loadUid();
    try {
      localStorage.removeItem(storageKey(uid));
    } catch {/* silent */}
  },
};
