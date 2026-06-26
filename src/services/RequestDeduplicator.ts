type RequestKey = string;

interface PendingRequest<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  createdAt: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

export class RequestDeduplicator {
  private static pending = new Map<RequestKey, PendingRequest<any>>();
  private static timeout = 30000;

  static async execute<T>(key: RequestKey, executor: () => Promise<T>): Promise<T> {
    const existing = this.pending.get(key);
    if (existing) {
      console.log(`[Dedup] Reusing pending request: ${key}`);
      return existing.promise;
    }

    let resolve: PendingRequest<T>['resolve'];
    let reject: PendingRequest<T>['reject'];

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    const timeoutId = setTimeout(() => {
      this.pending.delete(key);
      reject!(new Error(`Request timeout: ${key}`));
    }, this.timeout);

    this.pending.set(key, {
      promise,
      resolve: resolve!,
      reject: reject!,
      createdAt: Date.now(),
      timeoutId,
    });

    try {
      console.log(`[Dedup] Executing: ${key}`);
      const result = await executor();
      resolve!(result);
      clearTimeout(timeoutId);
      this.pending.delete(key);
      return result;
    } catch (error) {
      reject!(error);
      clearTimeout(timeoutId);
      this.pending.delete(key);
      throw error;
    }
  }

  static clearAll(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('Deduplicator cleared'));
    }
    this.pending.clear();
  }

  static getPendingCount(): number {
    return this.pending.size;
  }
}

export const requestDeduplicator = RequestDeduplicator;
