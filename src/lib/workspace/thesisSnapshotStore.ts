interface ThesisSnapshot {
  thesis?: string | null;
  stance?: string | null;
  generatedAt?: string;
}

const snapshots = new Map<string, ThesisSnapshot>();

export const thesisSnapshotStore = {
  getSnapshot(symbol: string): ThesisSnapshot | null {
    return snapshots.get(symbol) ?? null;
  },
  setSnapshot(symbol: string, snapshot: ThesisSnapshot): void {
    snapshots.set(symbol, snapshot);
  },
  clearAll(): void {
    snapshots.clear();
  },
};

export function getThesisSnapshot(_id: string) { return null; }
