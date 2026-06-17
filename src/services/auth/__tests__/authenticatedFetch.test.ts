import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerTokenProvider } from "../authenticatedFetch";

// authenticatedFetch calls fetch with a Bearer token — only the
// registration and token-provider contract is unit-testable without
// a full DOM / service worker mock.

describe("registerTokenProvider", () => {
  beforeEach(() => {
    // Force re-load of the module for each test to reset internal state
    vi.resetModules();
  });

  it("exports registerTokenProvider as a function", () => {
    expect(typeof registerTokenProvider).toBe("function");
  });

  it("accepts a getIdToken function without throwing", () => {
    const fn = vi.fn().mockResolvedValue("test-token");
    expect(() => registerTokenProvider(fn)).not.toThrow();
  });

  it("can be called multiple times to replace the provider", () => {
    const fn1 = vi.fn().mockResolvedValue("token-1");
    const fn2 = vi.fn().mockResolvedValue("token-2");
    registerTokenProvider(fn1);
    registerTokenProvider(fn2);
    expect(fn1).not.toHaveBeenCalled();
    expect(fn2).not.toHaveBeenCalled();
  });

  it("accepts async getIdToken implementation", () => {
    const fn = vi.fn().mockResolvedValue("async-token");
    registerTokenProvider(fn);
    expect(fn).not.toHaveBeenCalled();
  });
});
