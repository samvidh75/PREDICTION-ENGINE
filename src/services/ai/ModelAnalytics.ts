/**
 * Analytics for Model Loading & Inference
 * Tracks success rates, load times, sizes, and compression metrics
 */

export interface ModelLoadEvent {
  timestamp: number;
  status: 'success' | 'failure' | 'partial';
  loadTimeMs: number;
  modelSize: number;
  compressedSize: number;
  downloadSpeed: number; // MB/s
  inferenceTimeMs?: number;
  errorMessage?: string;
}

export interface ModelAnalyticsSnapshot {
  totalLoads: number;
  successfulLoads: number;
  failedLoads: number;
  successRate: number;
  avgLoadTimeMs: number;
  avgDownloadSpeedMBps: number;
  totalDataDownloadedMB: number;
  avgCompressionRatio: number;
  lastLoadEvent?: ModelLoadEvent;
}

const ANALYTICS_DB = 'stockex_model_analytics';
const ANALYTICS_STORE = 'events';
const ANALYTICS_KEY = 'snapshot';

class ModelAnalytics {
  private db: IDBDatabase | null = null;
  private events: ModelLoadEvent[] = [];

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(ANALYTICS_DB, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.loadEvents();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(ANALYTICS_STORE)) {
          db.createObjectStore(ANALYTICS_STORE, { keyPath: 'timestamp' });
        }
      };
    });
  }

  private async loadEvents(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve) => {
      const tx = this.db!.transaction([ANALYTICS_STORE], 'readonly');
      const store = tx.objectStore(ANALYTICS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        this.events = request.result as ModelLoadEvent[];
        resolve();
      };
      request.onerror = () => resolve();
    });
  }

  async recordLoadEvent(event: ModelLoadEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.events.push(event);

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([ANALYTICS_STORE], 'readwrite');
      const store = tx.objectStore(ANALYTICS_STORE);
      const request = store.add(event);

      request.onsuccess = () => {
        console.log('[Analytics] Event recorded:', {
          status: event.status,
          loadTimeMs: event.loadTimeMs,
          downloadSpeedMBps: event.downloadSpeed,
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  getSnapshot(): ModelAnalyticsSnapshot {
    const totalLoads = this.events.length;
    const successfulLoads = this.events.filter((e) => e.status === 'success').length;
    const failedLoads = this.events.filter((e) => e.status === 'failure').length;

    const successRate = totalLoads > 0 ? (successfulLoads / totalLoads) * 100 : 0;

    const avgLoadTimeMs =
      totalLoads > 0
        ? this.events.reduce((sum, e) => sum + e.loadTimeMs, 0) / totalLoads
        : 0;

    const avgDownloadSpeedMBps =
      totalLoads > 0
        ? this.events.reduce((sum, e) => sum + e.downloadSpeed, 0) / totalLoads
        : 0;

    const totalDataDownloadedMB =
      this.events.reduce((sum, e) => sum + e.modelSize, 0) / 1024 / 1024;

    const avgCompressionRatio =
      totalLoads > 0
        ? this.events.reduce((sum, e) => sum + e.modelSize / e.compressedSize, 0) /
          totalLoads
        : 1.0;

    return {
      totalLoads,
      successfulLoads,
      failedLoads,
      successRate: Math.round(successRate * 100) / 100,
      avgLoadTimeMs: Math.round(avgLoadTimeMs),
      avgDownloadSpeedMBps: Math.round(avgDownloadSpeedMBps * 10) / 10,
      totalDataDownloadedMB: Math.round(totalDataDownloadedMB * 100) / 100,
      avgCompressionRatio: Math.round(avgCompressionRatio * 100) / 100,
      lastLoadEvent: this.events[this.events.length - 1],
    };
  }

  printReport(): void {
    const snapshot = this.getSnapshot();

    console.log(`
╔════════════════════════════════════════════════════╗
║        Model Loading Analytics Report              ║
╠════════════════════════════════════════════════════╣
║ Total Loads:              ${String(snapshot.totalLoads).padEnd(24)} ║
║ Successful:               ${String(snapshot.successfulLoads).padEnd(24)} ║
║ Failed:                   ${String(snapshot.failedLoads).padEnd(24)} ║
║ Success Rate:             ${String(snapshot.successRate.toFixed(1) + '%').padEnd(24)} ║
╠════════════════════════════════════════════════════╣
║ Avg Load Time:            ${String(snapshot.avgLoadTimeMs.toFixed(0) + 'ms').padEnd(24)} ║
║ Avg Download Speed:       ${String(snapshot.avgDownloadSpeedMBps.toFixed(1) + 'MB/s').padEnd(24)} ║
║ Total Data Downloaded:    ${String(snapshot.totalDataDownloadedMB.toFixed(1) + 'MB').padEnd(24)} ║
║ Avg Compression Ratio:    ${String(snapshot.avgCompressionRatio.toFixed(2) + 'x').padEnd(24)} ║
╚════════════════════════════════════════════════════╝
    `);
  }

  clearAnalytics(): void {
    if (!this.db) throw new Error('Database not initialized');

    this.events = [];

    const tx = this.db.transaction([ANALYTICS_STORE], 'readwrite');
    const store = tx.objectStore(ANALYTICS_STORE);
    store.clear();

    console.log('[Analytics] All analytics cleared');
  }
}

export const modelAnalytics = new ModelAnalytics();
