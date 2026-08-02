type QueuedTask = {
  type: string;
  payload: any;
  resolve: (data: any) => void;
  reject: (error: Error) => void;
};

export class StockExWorkerPool {
  private static workerInstance: Worker | null = null;
  private static llmWorkerInstance: Worker | null = null;
  private static listeners: Map<string, (data: any) => void> = new Map();
  private static taskQueue: QueuedTask[] = [];
  private static llmTaskQueue: QueuedTask[] = [];
  private static busy = false;
  private static llmBusy = false;

  public static getWorker(): Worker {
    if (!this.workerInstance) {
      this.workerInstance = new Worker(
        new URL('./edgeAiWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.workerInstance.onmessage = (e: MessageEvent) => {
        this.busy = false;
        const msgType = e.data?.type as string | undefined;
        const pendingIdx = this.taskQueue.findIndex((t) => t.type === msgType);
        if (pendingIdx >= 0) {
          const { resolve } = this.taskQueue.splice(pendingIdx, 1)[0];
          resolve(e.data);
        }
        if (msgType) {
          const cb = this.listeners.get(msgType);
          if (cb) cb(e.data);
        }
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

  private static getLlmWorker(): Worker {
    if (!this.llmWorkerInstance) {
      this.llmWorkerInstance = new Worker(
        new URL('../browser-ai/edgeAiLlmWorker.ts', import.meta.url),
        { type: 'module' },
      );

      this.llmWorkerInstance.onmessage = (e: MessageEvent) => {
        this.llmBusy = false;
        const msgType = e.data?.type as string | undefined;
        const pendingIdx = this.llmTaskQueue.findIndex((t) => t.type === msgType);
        if (pendingIdx >= 0) {
          const { resolve } = this.llmTaskQueue.splice(pendingIdx, 1)[0];
          resolve(e.data);
        }
        this.processNextLlm();
      };

      this.llmWorkerInstance.onerror = (error) => {
        this.llmBusy = false;
        if (this.llmTaskQueue.length > 0) {
          const { reject } = this.llmTaskQueue.shift()!;
          reject(new Error(error.message));
        }
        this.processNextLlm();
      };
    }
    return this.llmWorkerInstance;
  }

  private static processNext(): void {
    if (this.busy || this.taskQueue.length === 0 || !this.workerInstance) return;
    this.busy = true;
    const { type, payload } = this.taskQueue[0];
    this.workerInstance.postMessage({ type, payload });
  }

  private static processNextLlm(): void {
    if (this.llmBusy || this.llmTaskQueue.length === 0 || !this.llmWorkerInstance) return;
    this.llmBusy = true;
    const { type, payload } = this.llmTaskQueue[0];
    this.llmWorkerInstance.postMessage({ type, payload });
  }

  public static executeTask(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getWorker();
      this.taskQueue.push({ type, payload, resolve, reject });
      this.processNext();
    });
  }

  public static executeLlmTask(type: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.getLlmWorker();
      this.llmTaskQueue.push({ type, payload, resolve, reject });
      this.processNextLlm();
    });
  }

  public static on(type: string, callback: (data: any) => void): void {
    this.listeners.set(type, callback);
  }

  public static off(type: string): void {
    this.listeners.delete(type);
  }

  public static dispatch(type: string, payload: any): void {
    this.getWorker().postMessage({ type, payload });
  }

  public static terminate(): void {
    if (this.workerInstance) {
      this.workerInstance.terminate();
      this.workerInstance = null;
    }
    if (this.llmWorkerInstance) {
      this.llmWorkerInstance.terminate();
      this.llmWorkerInstance = null;
    }
    this.listeners.clear();
    this.taskQueue = [];
    this.llmTaskQueue = [];
    this.busy = false;
    this.llmBusy = false;
  }
}
