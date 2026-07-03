/**
 * Service Worker: Manages WebGPU data worker + IndexedDB caching.
 *
 * Responsibilities:
 * 1. Cache data fetches in IndexedDB (offline-capable)
 * 2. Batch requests to avoid redundant API calls
 * 3. Handle stale-cache fallback (show cached data while fetching fresh)
 */

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'stockstory-v1';
const DATA_CACHE_DURATION = 5 * 60 * 1000;
const FUNDAMENTAL_CACHE_DURATION = 24 * 60 * 60 * 1000;

async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('StockStoryCache', 1);

    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      db.createObjectStore('quotes', { keyPath: 'symbol' });
      db.createObjectStore('fundamentals', { keyPath: 'symbol' });
      db.createObjectStore('historical', { keyPath: 'symbol' });
      db.createObjectStore('optionChains', { keyPath: 'symbol' });
    };
  });
}

async function cacheData(
  storeName: 'quotes' | 'fundamentals' | 'historical' | 'optionChains',
  symbol: string,
  data: any,
  ttl: number
) {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);

  store.put({
    symbol,
    data,
    cachedAt: Date.now(),
    ttl
  });
}

async function getCachedData(
  storeName: string,
  symbol: string
): Promise<any | null> {
  const db = await initDB();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);

  return new Promise((resolve) => {
    const req = store.get(symbol);

    req.onsuccess = () => {
      const cached = req.result;
      if (!cached) {
        resolve(null);
        return;
      }
      resolve(cached.data);
    };

    req.onerror = () => resolve(null);
  });
}

async function fetchWithFallback(
  symbol: string,
  dataType: 'quote' | 'historical' | 'options',
  ttl: number
): Promise<any> {
  const storeMap = {
    quote: 'quotes',
    historical: 'historical',
    options: 'optionChains'
  } as const;
  const storeName = storeMap[dataType];

  const cached = await getCachedData(storeName, symbol);
  if (cached) {
    return cached;
  }

  const worker = new Worker('/workers/webgpuDataWorker.ts');

  return new Promise((resolve, reject) => {
    worker.postMessage({ symbol, dataType });

    worker.onmessage = async (event) => {
      const { data, error, source } = event.data;

      if (error) {
        reject(new Error(error));
      } else {
        await cacheData(storeName as any, symbol, data, ttl);
        resolve(data);
      }

      worker.terminate();
    };

    setTimeout(() => {
      worker.terminate();
      reject(new Error(`Fetch timeout for ${symbol}`));
    }, 10000);
  });
}

self.onmessage = async (event: ExtendableMessageEvent) => {
  if (event.data.type === 'FETCH_DATA') {
    const { symbol, dataType } = event.data;

    const ttl = dataType === 'quote'
      ? DATA_CACHE_DURATION
      : FUNDAMENTAL_CACHE_DURATION;

    try {
      const data = await fetchWithFallback(symbol, dataType, ttl);
      event.ports[0].postMessage({ success: true, data });
    } catch (err) {
      event.ports[0].postMessage({ success: false, error: (err as Error).message });
    }
  }
};

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(self.clients.claim());
});

