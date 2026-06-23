export interface ExtractionRun {
  id: string;
  symbol: string;
  startedAt: string;
  completedAt?: string;
  ok: boolean;
  layersAttempted: string[];
  layersAvailable: string[];
  mappedFieldCount: number;
  activeFactorInputCount: number;
  errors: string[];
  elapsedMs: number;
}

export interface CanonicalSnapshotRecord {
  symbol: string;
  capturedAt: string;
  layersAvailable: string[];
  mappedFieldCount: number;
  ttlSeconds: number;
}

export class StockEdgeExtractionRunStore {
  private runs: ExtractionRun[] = [];
  private snapshots: Map<string, CanonicalSnapshotRecord> = new Map();

  recordRun(run: ExtractionRun): void {
    this.runs.push(run);
    if (this.runs.length > 1000) {
      this.runs = this.runs.slice(-500);
    }
  }

  getRecentRuns(limit = 20): ExtractionRun[] {
    return this.runs.slice(-limit).reverse();
  }

  getLastRunForSymbol(symbol: string): ExtractionRun | undefined {
    return this.runs.filter((r) => r.symbol === symbol).pop();
  }

  recordSnapshot(record: CanonicalSnapshotRecord): void {
    this.snapshots.set(record.symbol, record);
  }

  getSnapshot(symbol: string): CanonicalSnapshotRecord | undefined {
    const record = this.snapshots.get(symbol);
    if (!record) return undefined;
    const elapsed = Date.now() - new Date(record.capturedAt).getTime();
    if (elapsed > record.ttlSeconds * 1000) {
      this.snapshots.delete(symbol);
      return undefined;
    }
    return record;
  }

  allSnapshots(): CanonicalSnapshotRecord[] {
    return Array.from(this.snapshots.values());
  }

  clearAll(): void {
    this.runs = [];
    this.snapshots.clear();
  }
}

export const stockEdgeExtractionRunStore = new StockEdgeExtractionRunStore();
