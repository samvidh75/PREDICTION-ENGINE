// src/components/edge-ai/StockExWorkerPool.ts
// Phase 43 — Centralized Web Worker pool manager.
// Prevents browser resource leaks from multiple per-component workers.

export class StockExWorkerPool {
  private static workerInstance: Worker | null = null;
  private static listeners: Map<string, (data: any) => void> = new Map();

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
        const msgType = e.data?.type as string | undefined;
        if (msgType) {
          const cb = this.listeners.get(msgType);
          if (cb) cb(e.data);
        }
      };
    }
    return this.workerInstance;
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
   * Dispatch a task to the worker.
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
  }
}
