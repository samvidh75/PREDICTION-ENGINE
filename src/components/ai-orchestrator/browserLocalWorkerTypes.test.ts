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
