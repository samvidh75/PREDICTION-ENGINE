/**
 * Phase 18B — Browser-local runtime adapter.
 *
 * Manages the Web Worker lifecycle and provides a clean API for the
 * orchestrator to request AI explanations.  The worker is only created
 * when `ensureWorker()` is called — never at module import or page render.
 */

import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  WorkerEnvelope,
} from "./browserLocalWorkerTypes";

export type BrowserLocalRuntimeStatus =
  | "unloaded"
  | "loading"
  | "ready"
  | "error"
  | "unsupported";

export interface BrowserLocalRuntimeState {
  status: BrowserLocalRuntimeStatus;
  statusMessage: string;
}

export type RuntimeProgressCallback = (stage: string, percent?: number, message?: string) => void;

export type RuntimeErrorCallback = (message: string, recoverable: boolean) => void;

let worker: Worker | null = null;
const pendingResolve: Map<
  string,
  {
    resolve: (value: BrowserLocalWorkerResponse) => void;
    reject: (err: Error) => void;
  }
> = new Map();
let correlationCounter = 0;
let _progressCallback: RuntimeProgressCallback | null = null;
let _errorCallback: RuntimeErrorCallback | null = null;
let _status: BrowserLocalRuntimeState = { status: "unloaded", statusMessage: "" };

function nextCorrelationId(): string {
  correlationCounter += 1;
  return `blwr-${correlationCounter}-${Date.now()}`;
}

function buildWorker(): Worker {
  const wrk = new Worker(
    new URL("./browserLocalResearchWorker.ts", import.meta.url),
    { type: "module" },
  );

  wrk.onmessage = (event: MessageEvent<WorkerEnvelope<BrowserLocalWorkerResponse>>) => {
    const { correlationId, payload } = event.data;

    if (payload.tag === "progress") {
      _progressCallback?.(payload.stage, payload.percent, payload.message);
      return;
    }

    if (payload.tag === "error") {
      _errorCallback?.(payload.message, payload.recoverable);
    }

    const pending = pendingResolve.get(correlationId);
    if (pending) {
      pendingResolve.delete(correlationId);
      pending.resolve(payload);
    }
  };

  wrk.onerror = (err) => {
    const msg = err.message || "Unknown worker error";
    _status = { status: "error", statusMessage: msg };
    _errorCallback?.(msg, true);
  };

  return wrk;
}

function sendRequest(request: BrowserLocalWorkerRequest): Promise<BrowserLocalWorkerResponse> {
  if (!worker) {
    return Promise.reject(new Error("Worker not initialized. Call ensureWorker() first."));
  }

  const correlationId = nextCorrelationId();

  return new Promise<BrowserLocalWorkerResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingResolve.delete(correlationId);
      reject(new Error("Worker request timed out"));
    }, 120_000);

    pendingResolve.set(correlationId, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      reject: (err) => {
        clearTimeout(timeout);
        reject(err);
      },
    });

    const envelope: WorkerEnvelope<BrowserLocalWorkerRequest> = {
      correlationId,
      payload: request,
    };

    worker!.postMessage(envelope);
  });
}

/**
 * Ensure the Web Worker is created and ready.
 * Safe to call multiple times — only creates one worker.
 */
export async function ensureWorker(
  callbacks?: {
    onProgress?: RuntimeProgressCallback;
    onError?: RuntimeErrorCallback;
  },
): Promise<BrowserLocalRuntimeState> {
  if (callbacks?.onProgress) _progressCallback = callbacks.onProgress;
  if (callbacks?.onError) _errorCallback = callbacks.onError;

  if (worker) {
    return _status;
  }

  try {
    worker = buildWorker();
  } catch {
    _status = { status: "unsupported", statusMessage: "Web Workers not supported in this browser" };
    return _status;
  }

  _status = { status: "loading", statusMessage: "Starting worker…" };

  try {
    const result = await sendRequest({ tag: "init" });
    if (result.tag === "initResult" && result.ok) {
      _status = { status: "ready", statusMessage: result.message };
    } else if (result.tag === "error") {
      _status = { status: "error", statusMessage: result.message };
    } else {
      _status = { status: "error", statusMessage: "Unknown init result" };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to initialize worker";
    _status = { status: "error", statusMessage: msg };
  }

  return _status;
}

/**
 * Generate an AI explanation for the given prompt using the browser-local model.
 * The worker must be initialized first via `ensureWorker()`.
 */
export async function requestExplanation(
  prompt: string,
  maxTokens?: number,
): Promise<{ ok: boolean; text: string | null; runtimeMs: number }> {
  if (!worker || _status.status !== "ready") {
    return { ok: false, text: "Model not ready. Please initialize first.", runtimeMs: 0 };
  }

  const result = await sendRequest({ tag: "explain", prompt, maxTokens: maxTokens ?? 512 });

  if (result.tag === "explainResult") {
    return { ok: result.ok, text: result.text, runtimeMs: result.runtimeMs };
  }

  if (result.tag === "error") {
    return { ok: false, text: result.message, runtimeMs: 0 };
  }

  return { ok: false, text: "Unexpected response from worker", runtimeMs: 0 };
}

/**
 * Check whether the browser supports WebLLM (needs WebGPU).
 */
export async function checkCapability(): Promise<{ canUse: boolean; message: string }> {
  if (!worker) {
    // Quick synchronous check without starting the worker
    const hasWebGpu = typeof navigator !== "undefined" && "gpu" in navigator;
    const hasWorker = typeof Worker !== "undefined";
    const canUse = hasWebGpu && hasWorker;
    return {
      canUse,
      message: canUse ? "WebGPU + Worker supported" : "WebGPU or Worker not available",
    };
  }

  try {
    const result = await sendRequest({ tag: "checkCapability" });
    if (result.tag === "capabilityResult") {
      return { canUse: result.canUseWebLLM, message: result.message };
    }
  } catch {
    // fall through
  }
  return { canUse: false, message: "Unable to check capability" };
}

/**
 * Reset the chat session in the worker.
 */
export async function resetWorkerChat(): Promise<boolean> {
  if (!worker) return false;
  const result = await sendRequest({ tag: "reset" });
  return result.tag === "resetResult" && result.ok;
}

/**
 * Unload the model and terminate the worker to free resources.
 */
export async function unloadWorker(): Promise<void> {
  if (worker) {
    try {
      await sendRequest({ tag: "unload" });
    } catch {
      // ignore errors during teardown
    }
    worker.terminate();
    worker = null;
  }
  pendingResolve.clear();
  _status = { status: "unloaded", statusMessage: "" };
}

export function getStatus(): BrowserLocalRuntimeState {
  return { ..._status };
}
