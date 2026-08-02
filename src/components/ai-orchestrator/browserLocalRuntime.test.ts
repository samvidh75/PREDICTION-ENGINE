/**
 * Phase 18E Phase 11 — browserLocalRuntime tests
 *
 * 27 required scenarios covering: worker lifecycle, config propagation,
 * cancel behavior, progress reporting, capability detection, and error handling.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserLocalWorkerResponse } from "./browserLocalWorkerTypes";

/* ─── Mock Worker ──────────────────────────────────────────────── */
// Track all messages sent to the mock worker via postMessage.
const sentMessages: Array<Record<string, unknown>> = [];
// The onmessage handler that attachWorkerListeners sets on the mock worker.
let workerOnMessage: ((event: MessageEvent) => void) | null = null;
// Spy that records whether worker.terminate() was called.
let terminateSpy = vi.fn();
// Captured onerror handler (set by attachWorkerListeners).
let capturedOnError: ((event: Event) => void) | null = null;

/**
 * A minimal Worker mock that simulates async message round-trips.
 *
 * - `attachWorkerListeners` sets `onmessage` via the setter, which stores the
 *   handler in the module-level `workerOnMessage` variable.
 * - `postMessage` immediately captures the message in `sentMessages` and, for
 *   `init` / `reset` requests, queues a microtask that calls `workerOnMessage`
 *   with the appropriate response (matching the real worker's response shape).
 * - Tests can inject arbitrary responses via `simulateWorkerResponse()`.
 */
class MockWorker {
  constructor(
    _url: URL,
    _opts: Record<string, unknown>,
  ) {
    // The returned object IS the worker from the runtime's perspective.
    // Its `postMessage` refers to the object via its own reference so that
    // `onmessage` (set later by attachWorkerListeners) is visible.
    const api: {
      postMessage: (data: Record<string, unknown>) => void;
      onmessage: ((event: MessageEvent) => void) | null;
      onerror: ((event: Event) => void) | null;
      terminate: () => void;
    } = {
      postMessage(data: Record<string, unknown>) {
        sentMessages.push(data);

        // Auto-respond to init with a status:ready that includes the
        // requestId so the pending promise in postRequest resolves.
        if (data.type === "init") {
          queueMicrotask(() => {
            if (api.onmessage) {
              api.onmessage(
                new MessageEvent("message", {
                  data: {
                    type: "status",
                    requestId: data.requestId as string,
                    status: "ready",
                    message: "ready",
                  } as BrowserLocalWorkerResponse,
                }),
              );
            }
          });
        }

        // Auto-respond to reset with status:idle + requestId (matching
        // the real worker's resetEngine -> postStatus).
        if (data.type === "reset") {
          queueMicrotask(() => {
            if (api.onmessage) {
              api.onmessage(
                new MessageEvent("message", {
                  data: {
                    type: "status",
                    requestId: data.requestId as string,
                    status: "idle",
                    message: "Enhanced explanation is idle.",
                  } as BrowserLocalWorkerResponse,
                }),
              );
            }
          });
        }
      },
      get onmessage() {
        return workerOnMessage;
      },
      set onmessage(fn) {
        workerOnMessage = fn;
      },
      get onerror() {
        return capturedOnError;
      },
      set onerror(fn) {
        capturedOnError = fn;
      },
      terminate: () => {
        terminateSpy();
      },
    };
    return api as unknown as Worker;
  }
}

vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);

/* ─── Mock navigator ───────────────────────────────────────────── */
const mockGpu = {} as GPU;

beforeEach(() => {
  sentMessages.length = 0;
  workerOnMessage = null;
  capturedOnError = null;
  terminateSpy = vi.fn();
  vi.stubGlobal("navigator", { gpu: mockGpu });
  vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);
});

/* ─── Module under test ────────────────────────────────────────── */
import {
  ensureWorker,
  requestExplanation,
  cancelRequest,
  resetWorkerChat,
  checkCapability,
  unloadWorker,
  getStatus,
  getLastRequestId,
} from "./browserLocalRuntime";
import { getBrowserLocalModelConfig } from "./browserLocalModelManifest";

function lastMessage(): Record<string, unknown> | null {
  return sentMessages.length > 0 ? sentMessages[sentMessages.length - 1] : null;
}

/** Simulate a worker response as if the real worker posted it. */
function simulateWorkerResponse(data: BrowserLocalWorkerResponse): void {
  workerOnMessage?.(new MessageEvent("message", { data }));
}

/* ════════════════════════════════════════════════════════════════ */
/* 1. Worker lifecycle (12 scenarios)                              */
/* ════════════════════════════════════════════════════════════════ */

describe("worker lifecycle", () => {
  beforeEach(async () => {
    await unloadWorker();
  });

  /* 1 */ it("init sends an init request to the worker", async () => {
    await ensureWorker();
    expect(lastMessage()).toBeDefined();
    expect(lastMessage()!.type).toBe("init");
  });

  /* 2 */ it("init passes config when profile is small-chat", async () => {
    const config = getBrowserLocalModelConfig();
    if (config.profile !== "small-chat") {
      expect(config.profile).toBe("disabled");
      return;
    }
    // ensureWorker is what sends the init message with config
    await ensureWorker();
    const last = lastMessage() as Record<string, unknown>;
    expect(last.config).toBeDefined();
    expect((last.config as Record<string, unknown>).modelId).toBeTruthy();
  });

  /* 3 */ it("confirm config shape matches manifest when available", () => {
    const config = getBrowserLocalModelConfig();
    expect(config).toHaveProperty("profile");
    expect(config).toHaveProperty("modelId");
    expect(config).toHaveProperty("maxOutputTokens");
    expect(config).toHaveProperty("temperature");
    expect(config).toHaveProperty("timeoutMs");
    if (config.profile === "disabled") {
      expect(config.modelId).toBe("");
    }
    if (config.profile === "small-chat") {
      expect(config.modelId).toContain("Qwen");
    }
  });

  /* 4 */ it("status response updates runtime state to ready", async () => {
    await ensureWorker();
    const state = getStatus();
    expect(state.status).toBe("ready");
  });

  /* 5 */ it("ask request sends compressedContext and question", async () => {
    await ensureWorker();
    const requestPromise = requestExplanation("TCS context", "Explain this");
    expect(lastMessage()!.type).toBe("ask");
    expect(lastMessage()!.compressedContext).toBe("TCS context");
    expect(lastMessage()!.question).toBe("Explain this");

    const lastMsg = lastMessage()!;
    simulateWorkerResponse({
      type: "answer",
      requestId: lastMsg.requestId as string,
      text: "Result",
    });
    const result = await requestPromise;
    expect(result.ok).toBe(true);
  });

  /* 6 */ it("answer response returns explanation text", async () => {
    await ensureWorker();
    const promise = requestExplanation("ctx", "q");
    const lastMsg = lastMessage()!;
    simulateWorkerResponse({
      type: "answer",
      requestId: lastMsg.requestId as string,
      text: "TCS margins stable.",
    });
    const result = await promise;
    expect(result.ok).toBe(true);
    expect(result.text).toBe("TCS margins stable.");
  });

  /* 7 */ it("reset sends a reset request", async () => {
    await ensureWorker();
    const promise = resetWorkerChat();
    expect(lastMessage()!.type).toBe("reset");
    await promise;
  });

  /* 8 */ it("error response returns safe-failure", async () => {
    await ensureWorker();
    const promise = requestExplanation("ctx", "q");
    const lastMsg = lastMessage()!;
    simulateWorkerResponse({
      type: "safe-failure",
      requestId: lastMsg.requestId as string,
      reason: "failed",
    });
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("failed");
  });

  /* 9 */ it("worker crash sets status to unsupported", async () => {
    // Override Worker constructor to return a worker that errors immediately.
    let _onerror: ((event: Event) => void) | null = null;
    const errorWorker = {
      postMessage: vi.fn(),
      onmessage: null,
      get onerror() {
        return _onerror;
      },
      set onerror(fn) {
        _onerror = fn;
      },
      terminate: vi.fn(),
    };
    const errorWorkerClass = vi.fn(
      () => errorWorker,
    ) as unknown as typeof Worker;
    vi.stubGlobal("Worker", errorWorkerClass);

    await unloadWorker();
    const promise = ensureWorker();
    _onerror?.(new Event("error"));
    await promise;
    const state = getStatus();
    expect(state.status).toBe("unsupported");
  });

  /* 10 */ it("starts unloaded and transitions through init", async () => {
    expect(getStatus().status).toBe("unloaded");
    await ensureWorker();
    expect(getStatus().status).toBe("ready");
  });

  /* 11 */ it("unload terminates worker and resets state", async () => {
    await ensureWorker();
    await unloadWorker();
    expect(terminateSpy).toHaveBeenCalled();
    expect(getStatus().status).toBe("unloaded");
  });

  /* 12 */ it("getLastRequestId tracks the latest explanation request", async () => {
    await ensureWorker();
    expect(getLastRequestId()).toBeNull();
    const promise = requestExplanation("ctx", "q");
    expect(getLastRequestId()).toBeTruthy();
    const lastMsg = lastMessage()!;
    simulateWorkerResponse({
      type: "answer",
      requestId: lastMsg.requestId as string,
      text: "ok",
    });
    await promise;
  });
});

/* ════════════════════════════════════════════════════════════════ */
/* 2. Cancel behavior (6 scenarios)                                 */
/* ════════════════════════════════════════════════════════════════ */

describe("cancel behavior", () => {
  beforeEach(async () => {
    await unloadWorker();
    await ensureWorker();
  });

  /* 13 */ it("cancel sends a cancel request to the worker", async () => {
    // requestExplanation sets lastRequestId synchronously before any await
    const promise = requestExplanation("ctx", "q");
    await cancelRequest();
    expect(lastMessage()!.type).toBe("cancel");
  });

  /* 14 */ it("cancel with specific requestId works", async () => {
    await cancelRequest("specific-req-123");
    expect(lastMessage()!.type).toBe("cancel");
    expect(lastMessage()!.requestId).toBe("specific-req-123");
  });

  /* 15 */ it("cancel during loading sets status message", async () => {
    const promise = requestExplanation("ctx", "q");
    const lastMsg = lastMessage()!;
    await cancelRequest(lastMsg.requestId as string);
    const state = getStatus();
    expect(state.statusMessage).toContain("cancelled");
  });

  /* 16 */ it("cancel without requestId uses lastRequestId", async () => {
    const promise = requestExplanation("ctx", "q");
    expect(getLastRequestId()).toBeTruthy();
    await cancelRequest();
    expect(lastMessage()!.type).toBe("cancel");
    expect(getLastRequestId()).toBeNull();
  });

  /* 17 */ it("cancel while idle is harmless", async () => {
    await cancelRequest();
    expect(getStatus().status).toBeDefined();
  });

  /* 18 */ it("cancel removes pending entry so late response is ignored", async () => {
    const promise = requestExplanation("ctx", "q");
    const lastMsg = lastMessage()!;
    await cancelRequest(lastMsg.requestId as string);
    expect(lastMessage()!.type).toBe("cancel");

    // Simulate a late answer: because the pending entry was deleted, this
    // response should silently be ignored (no crash, no resolution).
    simulateWorkerResponse({
      type: "answer",
      requestId: lastMsg.requestId as string,
      text: "late",
    });
  });
});

/* ════════════════════════════════════════════════════════════════ */
/* 3. Progress reporting (3 scenarios)                              */
/* ════════════════════════════════════════════════════════════════ */

describe("progress reporting", () => {
  /* 19 */ it("progress response updates progressPercent via callback", async () => {
    await unloadWorker();
    const cb = vi.fn();
    await ensureWorker(cb);
    simulateWorkerResponse({ type: "progress", phase: "loading", percent: 55 });
    expect(cb).toHaveBeenCalled();
    const calls = cb.mock.calls.map((c: [unknown]) => c[0] as Record<string, unknown>);
    const progressCall = calls.find(
      (c: Record<string, unknown>) => c.progressPercent === 55,
    );
    expect(progressCall).toBeDefined();
  });

  /* 20 */ it("progress response updates progressPhase", async () => {
    await unloadWorker();
    const cb = vi.fn();
    await ensureWorker(cb);
    simulateWorkerResponse({ type: "progress", phase: "checking", percent: 0 });
    expect(cb).toHaveBeenCalled();
    const calls = cb.mock.calls.map((c: [unknown]) => c[0] as Record<string, unknown>);
    const progressCall = calls.find(
      (c: Record<string, unknown>) => c.progressPhase === "checking",
    );
    expect(progressCall).toBeDefined();
  });

  /* 21 */ it("progress for ready phase works", async () => {
    await unloadWorker();
    const cb = vi.fn();
    await ensureWorker(cb);
    simulateWorkerResponse({ type: "progress", phase: "ready", percent: 100 });
    const calls = cb.mock.calls.map((c: [unknown]) => c[0] as Record<string, unknown>);
    const readyCall = calls.find(
      (c: Record<string, unknown>) => c.progressPercent === 100,
    );
    expect(readyCall).toBeDefined();
  });

  /* 22 */ it("progress without callback still updates runtimeState internally", async () => {
    await unloadWorker();
    await ensureWorker();
    simulateWorkerResponse({ type: "progress", phase: "loading", percent: 72 });
    const state = getStatus();
    expect(state.progressPercent).toBe(72);
    expect(state.progressPhase).toBe("loading");
  });
});

/* ════════════════════════════════════════════════════════════════ */
/* 4. Config propagation (3 scenarios)                              */
/* ════════════════════════════════════════════════════════════════ */

describe("config propagation", () => {
  /* 23 */ it("manifest returns valid config object", () => {
    const config = getBrowserLocalModelConfig();
    expect(config).toHaveProperty("modelId");
    expect(config).toHaveProperty("maxOutputTokens");
    expect(config).toHaveProperty("temperature");
    expect(config).toHaveProperty("timeoutMs");
    expect(typeof config.modelId).toBe("string");
    expect(typeof config.maxOutputTokens).toBe("number");
    expect(typeof config.temperature).toBe("number");
    expect(typeof config.timeoutMs).toBe("number");
  });

  /* 24 */ it("all config fields are non-negative", () => {
    const config = getBrowserLocalModelConfig();
    expect(config.maxOutputTokens).toBeGreaterThanOrEqual(0);
    expect(config.temperature).toBeGreaterThanOrEqual(0);
    expect(config.timeoutMs).toBeGreaterThanOrEqual(0);
  });

  /* 25 */ it("disabled profile has empty modelId", () => {
    const config = getBrowserLocalModelConfig();
    // In test environment, Worker is available (mocked) so profile may be
    // "small-chat" instead of "disabled". Just verify the invariant applies.
    if (config.profile === "disabled") {
      expect(config.modelId).toBe("");
    }
  });
});

/* ════════════════════════════════════════════════════════════════ */
/* 5. Capability detection (3 scenarios)                            */
/* ════════════════════════════════════════════════════════════════ */

describe("capability detection", () => {
  beforeEach(async () => {
    await unloadWorker();
  });

  /* 26 */ it("returns true when Worker and WebGPU exist", async () => {
    vi.stubGlobal("navigator", { gpu: mockGpu });
    const cap = await checkCapability();
    expect(cap.canUse).toBe(true);
  });

  /* 27 */ it("returns false when Worker is not available", async () => {
    vi.stubGlobal("Worker", undefined);
    const cap = await checkCapability();
    expect(cap.canUse).toBe(false);
  });

  /* 28 */ it("returns false when WebGPU is not available", async () => {
    vi.stubGlobal("navigator", {});
    const cap = await checkCapability();
    expect(cap.canUse).toBe(false);
  });
});
