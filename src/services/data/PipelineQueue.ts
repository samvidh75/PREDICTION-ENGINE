// Rate-limited queue for pipeline runs.
// ScreenerProvider is limited to 6 req/min (1 concurrent). This queue
// prevents thundering-herd from the scanner loading 50 stocks at once.

interface QueueEntry<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class PipelineQueue {
  private readonly maxConcurrent: number;
  private readonly delayMs: number;
  private running = 0;
  private lastStartedAt = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queue: Array<QueueEntry<any>> = [];

  constructor({ maxConcurrent = 3, delayMs = 12_000 } = {}) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
  }

  enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.drain();
    });
  }

  private drain(): void {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) return;

    const now = Date.now();
    const sinceLastStart = now - this.lastStartedAt;
    const wait = sinceLastStart < this.delayMs ? this.delayMs - sinceLastStart : 0;

    if (wait > 0) {
      setTimeout(() => this.drain(), wait);
      return;
    }

    const entry = this.queue.shift();
    if (!entry) return;

    this.running++;
    this.lastStartedAt = Date.now();

    entry.fn().then(
      (value) => { this.running--; entry.resolve(value); this.drain(); },
      (reason) => { this.running--; entry.reject(reason); this.drain(); },
    );

    // Kick off next slot immediately (up to maxConcurrent)
    this.drain();
  }

  get pending(): number {
    return this.queue.length;
  }

  get active(): number {
    return this.running;
  }
}

export const globalPipelineQueue = new PipelineQueue({ maxConcurrent: 3, delayMs: 12_000 });
