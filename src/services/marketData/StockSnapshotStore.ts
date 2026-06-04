import { type IndianStock } from "../stocks/StockMetadata";

export class StockSnapshotStore {
  private static snapshots = new Map<string, IndianStock>();

  static saveSnapshot(ticker: string, data: IndianStock): void {
    this.snapshots.set(ticker.toUpperCase(), { ...data });
  }

  static getSnapshot(ticker: string): IndianStock | null {
    return this.snapshots.get(ticker.toUpperCase()) || null;
  }
}
