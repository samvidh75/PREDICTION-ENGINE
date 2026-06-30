import { describe, it, expect } from "vitest";
import type {
  BrowserLocalWorkerRequest,
  BrowserLocalWorkerResponse,
  WorkerEnvelope,
} from "./browserLocalWorkerTypes";

describe("browserLocalWorkerTypes", () => {
  it("accepts a valid init request", () => {
    const req: BrowserLocalWorkerRequest = { tag: "init" };
    expect(req.tag).toBe("init");
  });

  it("accepts a valid explain request with optional fields", () => {
    const req: BrowserLocalWorkerRequest = {
      tag: "explain",
      prompt: "What does this stock do?",
      maxTokens: 256,
    };
    expect(req.tag).toBe("explain");
    expect(req.prompt).toBe("What does this stock do?");
    expect(req.maxTokens).toBe(256);
  });

  it("accepts an explain request without maxTokens", () => {
    const req: BrowserLocalWorkerRequest = {
      tag: "explain",
      prompt: "Summarize",
    };
    expect(req.tag).toBe("explain");
    expect(req.maxTokens).toBeUndefined();
  });

  it("accepts a progress response", () => {
    const res: BrowserLocalWorkerResponse = {
      tag: "progress",
      stage: "loading",
      percent: 42,
      message: "Loading model weights…",
    };
    expect(res.tag).toBe("progress");
    expect(res.stage).toBe("loading");
  });

  it("accepts a capability result", () => {
    const res: BrowserLocalWorkerResponse = {
      tag: "capabilityResult",
      canUseWebLLM: true,
      message: "WebGPU supported",
    };
    expect(res.tag).toBe("capabilityResult");
    expect(res.canUseWebLLM).toBe(true);
  });

  it("accepts an error response", () => {
    const res: BrowserLocalWorkerResponse = {
      tag: "error",
      message: "Model failed to load",
      recoverable: true,
    };
    expect(res.tag).toBe("error");
    expect(res.recoverable).toBe(true);
  });

  it("wraps in an envelope with correlationId", () => {
    const envelope: WorkerEnvelope<BrowserLocalWorkerRequest> = {
      correlationId: "corr-123",
      payload: { tag: "reset" },
    };
    expect(envelope.correlationId).toBe("corr-123");
    expect(envelope.payload.tag).toBe("reset");
  });
});
