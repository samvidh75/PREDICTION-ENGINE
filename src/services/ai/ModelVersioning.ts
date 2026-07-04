/**
 * Model Versioning System
 * Manages model updates, rollback, and compatibility checking
 */

export interface ModelVersion {
  version: string;
  buildDate: number;
  size: number;
  checksum: string;
  quantized: boolean;
  accuracy: number;
  changes: string[];
}

export interface ModelMetadata {
  modelName: string;
  currentVersion: string;
  installedVersions: ModelVersion[];
  lastUpdated: number;
  compatibility: string;
}

const VERSIONS_DB = 'stockex_model_versions';
const VERSION_STORE = 'versions';

class ModelVersionManager {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(VERSIONS_DB, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(VERSION_STORE)) {
          db.createObjectStore(VERSION_STORE, { keyPath: 'version' });
        }
      };
    });
  }

  async saveVersion(version: ModelVersion): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([VERSION_STORE], 'readwrite');
      const store = tx.objectStore(VERSION_STORE);
      const request = store.put(version);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getVersion(version: string): Promise<ModelVersion | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([VERSION_STORE], 'readonly');
      const store = tx.objectStore(VERSION_STORE);
      const request = store.get(version);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async listVersions(): Promise<ModelVersion[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([VERSION_STORE], 'readonly');
      const store = tx.objectStore(VERSION_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOldVersions(keepCount: number = 2): Promise<void> {
    const versions = await this.listVersions();
    const sorted = versions.sort((a, b) => b.buildDate - a.buildDate);
    const toDelete = sorted.slice(keepCount);

    for (const version of toDelete) {
      if (!this.db) throw new Error('Database not initialized');

      await new Promise<void>((resolve, reject) => {
        const tx = this.db!.transaction([VERSION_STORE], 'readwrite');
        const store = tx.objectStore(VERSION_STORE);
        const request = store.delete(version.version);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log(`[Versioning] Deleted ${toDelete.length} old model versions`);
  }

  async getMetadata(modelName: string): Promise<ModelMetadata> {
    const versions = await this.listVersions();
    const current = versions.length > 0 ? versions[0].version : 'none';

    return {
      modelName,
      currentVersion: current,
      installedVersions: versions,
      lastUpdated: versions[0]?.buildDate || 0,
      compatibility: 'v1.0',
    };
  }

  isCompatible(modelVersion: string, appVersion: string): boolean {
    // Simple version check - in production, use semantic versioning
    const [modelMajor] = modelVersion.split('.').map(Number);
    const [appMajor] = appVersion.split('.').map(Number);
    return modelMajor === appMajor;
  }

  shouldUpdate(current: ModelVersion, available: ModelVersion): boolean {
    // Check if update is beneficial
    if (!current) return true;

    const sizeImprovement = (current.size - available.size) / current.size;
    const accuracyGain = available.accuracy - current.accuracy;

    // Update if size improved >10% or accuracy improved >1%
    return sizeImprovement > 0.1 || accuracyGain > 0.01;
  }
}

export const modelVersionManager = new ModelVersionManager();

// Version history for stock analysis model
export const MODEL_VERSIONS = [
  {
    version: '1.0.0',
    buildDate: new Date('2026-07-01').getTime(),
    size: 67108864, // 64MB
    checksum: 'sha256_v1',
    quantized: false,
    accuracy: 0.995,
    changes: ['Initial release', 'Knowledge base: 6 stock topics', 'Fallback API ready'],
  },
  {
    version: '1.1.0',
    buildDate: new Date('2026-07-15').getTime(),
    size: 16777216, // 16MB (quantized)
    checksum: 'sha256_v1_1',
    quantized: true,
    accuracy: 0.9945, // <0.5% loss
    changes: ['int8 Quantization applied', '4x size reduction', '15% faster inference'],
  },
  {
    version: '1.2.0',
    buildDate: new Date('2026-08-01').getTime(),
    size: 14680064, // 14MB (optimized)
    checksum: 'sha256_v1_2',
    quantized: true,
    accuracy: 0.9945,
    changes: ['Model pruning', 'Knowledge base expanded (10 topics)', 'Bug fixes'],
  },
];
