import { cacheService } from '@/services';

export class CacheCleanupWorker {
  private interval: ReturnType<typeof setInterval> | null = null;

  start(intervalMs = 600000): void {
    this.run();
    this.interval = setInterval(() => this.run(), intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private run(): void {
  }
}

export const cacheCleanupWorker = new CacheCleanupWorker();
