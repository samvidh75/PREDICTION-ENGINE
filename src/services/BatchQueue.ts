import { cacheService } from './CacheService';

interface BatchItem<T> {
  key: string;
  executor: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  addedAt: number;
}

export class BatchQueue {
  private queue = new Map<string, BatchItem<any>>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private batchDuration = Math.max(10000, Math.min(120000, parseInt(process.env.BATCH_QUEUE_DURATION_MS || '120000', 10)));

  async enqueue<T>(key: string, executor: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const existing = this.queue.get(key);
      if (existing) {
        resolve(existing.resolve as unknown as T);
        return;
      }

      this.queue.set(key, { key, executor, resolve, reject, addedAt: Date.now() });
      console.log(`[BatchQueue] Queued: ${key} (total: ${this.queue.size})`);

      if (!this.timer) {
        console.log(`[BatchQueue] Timer started (${this.batchDuration}ms)`);
        this.timer = setTimeout(() => this.processBatch(), this.batchDuration);
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.queue.size === 0) {
      this.timer = null;
      return;
    }

    const items = Array.from(this.queue.values());
    const uniqueKeys = new Set(items.map(i => i.key));
    console.log(`[BatchQueue] Processing ${items.length} items (${uniqueKeys.size} unique)`);

    this.queue.clear();
    this.timer = null;

    const results = await Promise.allSettled(items.map(item => item.executor()));

    for (let i = 0; i < items.length; i++) {
      const result = results[i];
      if (result.status === 'fulfilled') {
        items[i].resolve(result.value);
      } else {
        items[i].reject(result.reason);
      }
    }
    console.log(`[BatchQueue] Batch done`);
  }

  async flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.processBatch();
  }

  getQueueSize(): number {
    return this.queue.size;
  }
}

export const batchQueue = new BatchQueue();
