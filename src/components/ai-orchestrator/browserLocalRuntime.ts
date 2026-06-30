import { getBrowserLocalModelConfig } from "./browserLocalModelManifest";
import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  BrowserLocalWorkerStatus,
} from "./browserLocalWorkerTypes";

export type BrowserLocalRuntimeStatus = "unloaded" | BrowserLocalWorkerStatus;

export interface BrowserLocalRuntimeState {
  status: BrowserLocalRuntimeStatus;
  statusMessage: string;
  progressPercent?: number;
  progressPhase?: "checking" | "loading" | "ready";
}

let worker: Worker | null = null;
let requestCounter = 0;
let runtimeState: BrowserLocalRuntimeState = { status: "unloaded", statusMessage: "" };
const pending = new Map<
  string,
  {
    resolve: (response: BrowserLocalWorkerResponse) => void;
    reject: (error: Error) => void;
  }
>();
let progressListener: ((state: BrowserLocalRuntimeState) => void) | null = null;
let lastRequestId: string | null = null;

function nextRequestId(): string {
  requestCounter += 1;
  return `browser-local-${requestCounter}-${Date.now()}`;
}

function updateRuntimeState(status: BrowserLocalRuntimeStatus, statusMessage = ""): void {
  runtimeState = { status, statusMessage };
  progressListener?.(getStatus());
}

function attachWorkerListeners(nextWorker: Worker): void {
  nextWorker.onmessage = (event: MessageEvent<BrowserLocalWorkerResponse>) => {
    const payload = event.data;

    if (payload.type === "status") {
      updateRuntimeState(payload.status, payload.message ?? "");
    }

    if (payload.type === "progress") {
      updateRuntimeState(
        payload.phase === "ready" ? "ready" : payload.phase === "loading" ? "loading" : "checking",
        payload.phase === "ready" ? "Enhanced explanation is ready." : "Preparing enhanced explanation\u2026",
      );
      runtimeState.progressPercent = payload.percent;
      runtimeState.progressPhase = payload.phase;
      progressListener?.(getStatus());
    }

    if ("requestId" in payload && payload.requestId && payload.type !== "progress") {
      const current = pending.get(payload.requestId);
      if (!current) return;
      pending.delete(payload.requestId);
      current.resolve(payload);
    }
  };

  nextWorker.onerror = () => {
    updateRuntimeState("failed", "Enhanced explanation could not start.");
  };
}

function ensureWorkerInstance(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") {
    updateRuntimeState("unsupported", "Enhanced explanation is unavailable on this device.");
    return null;
  }

  try {
    worker = new Worker(new URL("./browserLocalResearchWorker.ts", import.meta.url), { type: "module" });
    attachWorkerListeners(worker);
    return worker;
  } catch {
    updateRuntimeState("unsupported", "Enhanced explanation is unavailable on this device.");
    return null;
  }
}

function postRequest(request: BrowserLocalWorkerRequest, timeoutMs = 35_000): Promise<BrowserLocalWorkerResponse> {
  const activeWorker = ensureWorkerInstance();
  if (!activeWorker) {
    return Promise.resolve({ type: "safe-failure", requestId: request.requestId, reason: "unsupported" });
  }

  return new Promise<BrowserLocalWorkerResponse>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(request.requestId);
      reject(new Error("timeout"));
    }, timeoutMs);

    pending.set(request.requestId, {
      resolve: (response) => {
        clearTimeout(timeout);
        resolve(response);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    activeWorker.postMessage(request);
  });
}

export async function ensureWorker(callback?: (state: BrowserLocalRuntimeState) => void): Promise<BrowserLocalRuntimeState> {
  if (callback) progressListener = callback;
  if (runtimeState.status === "ready") return getStatus();

  const requestId = nextRequestId();
  const manifest = getBrowserLocalModelConfig();
  updateRuntimeState("checking", "Checking enhanced explanation.");
  const response = await postRequest({ type: "init", requestId, config: manifest.profile === "disabled" ? undefined : { modelId: manifest.modelId, maxOutputTokens: manifest.maxOutputTokens, temperature: manifest.temperature, timeoutMs: manifest.timeoutMs } });

  if (response.type === "safe-failure") {
    updateRuntimeState(response.reason === "unsupported" ? "unsupported" : "failed", "Enhanced explanation is unavailable on this device.");
  }

  return getStatus();
}

/** Returns the requestId of the current explanation, or null if none. */
export function getLastRequestId(): string | null {
  return lastRequestId;
}

export async function requestExplanation(
  compressedContext: string,
  question: string,
): Promise<{ ok: boolean; text: string | null; reason?: "unsupported" | "disabled" | "not_ready" | "unsafe_output" | "timeout" | "failed" | "no_context" }> {
  const requestId = nextRequestId();
  lastRequestId = requestId;
  updateRuntimeState("loading", "Preparing enhanced explanation.");

  try {
    const response = await postRequest(
      {
        type: "ask",
        requestId,
        compressedContext,
        question,
      },
      35_000,
    );

    if (response.type === "answer") {
      updateRuntimeState("ready", "Enhanced explanation is ready.");
      return { ok: true, text: response.text };
    }

    if (response.type === "safe-failure") {
      updateRuntimeState(response.reason === "unsupported" ? "unsupported" : "failed", "Enhanced explanation is unavailable on this device.");
      return { ok: false, text: null, reason: response.reason };
    }

    updateRuntimeState("failed", "Enhanced explanation is unavailable on this device.");
    return { ok: false, text: null, reason: "failed" };
  } catch (error) {
    updateRuntimeState("failed", "Enhanced explanation took too long.");
    return {
      ok: false,
      text: null,
      reason: error instanceof Error && error.message === "timeout" ? "timeout" : "failed",
    };
  }
}

export async function cancelRequest(requestId?: string): Promise<void> {
  const id = requestId ?? lastRequestId;
  if (!worker || !id) return;
  worker.postMessage({ type: "cancel", requestId: id } satisfies BrowserLocalWorkerRequest);
  pending.delete(id);
  lastRequestId = null;
  updateRuntimeState(runtimeState.status, "Enhanced explanation cancelled.");
}

export async function resetWorkerChat(): Promise<void> {
  if (!worker) return;
  const requestId = nextRequestId();
  await postRequest({ type: "reset", requestId }, 10_000);
  updateRuntimeState("idle", "Enhanced explanation is idle.");
}

export async function checkCapability(): Promise<{ canUse: boolean; message: string }> {
  const canUse = typeof Worker !== "undefined" && typeof navigator !== "undefined" && "gpu" in navigator;
  return {
    canUse,
    message: canUse ? "Enhanced explanation is available." : "Enhanced explanation is unavailable on this device.",
  };
}

export async function unloadWorker(): Promise<void> {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  pending.clear();
  updateRuntimeState("unloaded", "");
}

export function getStatus(): BrowserLocalRuntimeState {
  return { ...runtimeState };
}
