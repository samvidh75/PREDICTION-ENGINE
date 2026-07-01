// src/components/edge-ai/StockExWorkerPool.ts
// Phase 43 — Centralized Web Worker pool manager with task queueing.
// Prevents browser resource leaks from multiple per-component workers.

type QueuedTask = {
  type: string;
  payload: any;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
};

export class StockExWorkerPool {
  private static workerInstance: Worker | null = null;
  private static listeners: Map<string, (data: any) => void> = new Map();
  private static taskQueue: QueuedTask[] = [];
  private static busy = false;

  /**
   * Get or create the singleton Web Worker instance.
   */
  public static getWorker(): Worker {
    if (!this.workerInstance) {
      this.workerInstance = new Worker(
        new URL("./edgeAiWorker.ts", import.meta.url),
        { type: "module" },
      );

      this.workerInstance.onmessage = (e: MessageEvent) => {
        this.busy = false;

        // Process queued task (Promise-based)
        const msgType = e.data?.type as string | undefined;
        const pendingIdx = this.taskQueue.findIndex((t) => t.type === msgType);
        if (pendingIdx >= 0) {
          const { resolve } = this.taskQueue.splice(pendingIdx, 1)[0];
          resolve(e.data);
        }

        // Also dispatch to registered listeners
        if (msgType) {
          const cb = this.listeners.get(msgType);
          if (cb) cb(e.data);
        }

        // Process next queued task
        this.processNext();
      };

      this.workerInstance.onerror = (error) => {
        this.busy = false;
        if (this.taskQueue.length > 0) {
          const { reject } = this.taskQueue.shift()!;
          reject(new Error(error.message));
        }
        this.processNext();
      };
    }
    return this.workerInstance;
  }

  private static processNext(): void {
    if (this.busy || this.taskQueue.length === 0 || !this.workerInstance) return;
    this.busy = true;
    const { type, payload } = this.taskQueue[0];
    this.workerInstance.postMessage({ type, payload });
  }

  /**
   * Execute a task via the worker pool with Promise-based queueing.
   * Tasks are executed sequentially — no worker overload.
   */
  public static executeTask(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getWorker();
      this.taskQueue.push({ type, payload, resolve, reject });
      this.processNext();
    });
  }

  /**
   * Register a listener for a specific message type from the worker.
   */
  public static on(type: string, callback: (data: any) => void): void {
    this.listeners.set(type, callback);
  }

  /**
   * Remove a listener.
   */
  public static off(type: string): void {
    this.listeners.delete(type);
  }

  /**
   * Dispatch a task to the worker (fire-and-forget).
   */
  public static dispatch(type: string, payload: any): void {
    this.getWorker().postMessage({ type, payload });
  }

  /**
   * Terminate the worker and reset state.
   */
  public static terminate(): void {
    if (this.workerInstance) {
      this.workerInstance.terminate();
      this.workerInstance = null;
    }
    this.listeners.clear();
    this.taskQueue = [];
    this.busy = false;
  }
}
