import { describe, expect, it } from "vitest";
import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  BrowserLocalWorkerStatus,
} from "./browserLocalWorkerTypes";

describe("browserLocalWorkerTypes", () => {
  it("accepts the init request shape", () => {
    const request: BrowserLocalWorkerRequest = { type: "init", requestId: "req-1" };
    expect(request.type).toBe("init");
  });

  it("accepts init with model config from manifest", () => {
    const request: BrowserLocalWorkerRequest = {
      type: "init",
      requestId: "req-config",
      config: { modelId: "Qwen2.5-1.5B", maxOutputTokens: 180, temperature: 0.2, timeoutMs: 30_000 },
    };
    expect(request.type).toBe("init");
    expect(request.config?.modelId).toBe("Qwen2.5-1.5B");
    expect(request.config?.maxOutputTokens).toBe(180);
    expect(request.config?.timeoutMs).toBe(30_000);
  });

  it("accepts init without optional config", () => {
    const request: BrowserLocalWorkerRequest = { type: "init", requestId: "req-no-config" };
    expect(request.config).toBeUndefined();
  });

  it("accepts the ask request shape with compressed safe context", () => {
    const request: BrowserLocalWorkerRequest = {
      type: "ask",
      requestId: "req-2",
      compressedContext: "TCS Research context: Margin quality remains steady.",
      question: "Explain this view",
    };

    expect(request.type).toBe("ask");
    expect(request.compressedContext).toContain("Research context");
  });

  it("accepts the reset request shape", () => {
    const request: BrowserLocalWorkerRequest = { type: "reset", requestId: "req-3" };
    expect(request.type).toBe("reset");
  });

  it("accepts a cancel request shape", () => {
    const request: BrowserLocalWorkerRequest = { type: "cancel", requestId: "req-cancel-1" };
    expect(request.type).toBe("cancel");
  });

  it("accepts a progress response", () => {
    const response: BrowserLocalWorkerResponse = {
      type: "progress",
      phase: "loading",
      percent: 42,
    };

    expect(response.type).toBe("progress");
    expect(response.phase).toBe("loading");
    expect(response.percent).toBe(42);
  });

  it("accepts a status response", () => {
    const response: BrowserLocalWorkerResponse = {
      type: "status",
      status: "loading",
      message: "Preparing enhanced explanation.",
    };

    expect(response.type).toBe("status");
    expect(response.status).toBe("loading");
  });

  it("accepts an answer response", () => {
    const response: BrowserLocalWorkerResponse = {
      type: "answer",
      requestId: "req-4",
      text: "Revenue quality remains steady while valuation needs review.",
    };

    expect(response.type).toBe("answer");
    expect(response.text).toContain("Revenue quality");
  });

  it("accepts a safe failure response", () => {
    const response: BrowserLocalWorkerResponse = {
      type: "safe-failure",
      requestId: "req-5",
      reason: "unsupported",
    };

    expect(response.type).toBe("safe-failure");
    expect(response.reason).toBe("unsupported");
  });

  it("covers all allowed worker statuses", () => {
    const statuses: BrowserLocalWorkerStatus[] = [
      "idle",
      "checking",
      "loading",
      "ready",
      "failed",
      "unsupported",
    ];

    expect(statuses).toHaveLength(6);
  });
});
