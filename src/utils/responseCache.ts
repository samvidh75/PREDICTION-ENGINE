/**
 * Response Cache Service
 * Reduces API calls by caching similar questions
 * Uses IndexedDB for persistent storage + semantic similarity matching
 */

interface CachedResponse {
  id: string;
  question: string;
  response: string;
  modelUsed: string;
  timestamp: number;
  similarity?: number;
}

const DB_NAME = 'StockExAI';
const STORE_NAME = 'responses';
const SIMILARITY_THRESHOLD = 0.75; // 75% similarity required

class ResponseCache {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize IndexedDB
   */
  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  /**
   * Calculate similarity between two strings (Jaccard similarity)
   * Simple but effective for stock-related questions
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get cached response if similar question exists
   */
  async getIfSimilar(question: string, maxAgeDays = 7): Promise<CachedResponse | null> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allResponses = request.result as CachedResponse[];
        const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

        // Find most similar recent response
        let bestMatch: CachedResponse | null = null;
        let bestSimilarity = 0;

        for (const response of allResponses) {
          if (response.timestamp < cutoffTime) continue;

          const similarity = this.calculateSimilarity(question, response.question);
          if (similarity > bestSimilarity && similarity >= SIMILARITY_THRESHOLD) {
            bestSimilarity = similarity;
            bestMatch = response;
          }
        }

        resolve(bestMatch || null);
      };

      request.onerror = () => resolve(null);
    });
  }

  /**
   * Store response in cache
   */
  async set(question: string, response: string, modelUsed: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const cacheEntry: CachedResponse = {
        id: `${Date.now()}_${Math.random()}`,
        question,
        response,
        modelUsed,
        timestamp: Date.now(),
      };

      const request = store.add(cacheEntry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalCached: number;
    storageSize: number;
    oldestEntry: number;
  }> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const responses = request.result as CachedResponse[];
        const storageSize = JSON.stringify(responses).length;
        const oldestEntry = responses.length > 0
          ? Math.min(...responses.map((r) => r.timestamp))
          : 0;

        resolve({
          totalCached: responses.length,
          storageSize,
          oldestEntry,
        });
      };

      request.onerror = () => {
        resolve({ totalCached: 0, storageSize: 0, oldestEntry: 0 });
      };
    });
  }

  /**
   * Clear old entries (older than maxAgeDays)
   */
  async cleanupOldEntries(maxAgeDays = 30): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const allResponses = request.result as CachedResponse[];
        const cutoffTime = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;
        let deletedCount = 0;

        for (const response of allResponses) {
          if (response.timestamp < cutoffTime) {
            store.delete(response.id);
            deletedCount++;
          }
        }

        resolve(deletedCount);
      };

      request.onerror = () => resolve(0);
    });
  }
}

// Export singleton
export const responseCache = new ResponseCache();
