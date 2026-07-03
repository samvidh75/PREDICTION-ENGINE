import { describe, expect, it, beforeEach, vi, afterEach } from "vitest";
import { analytics } from "./anonymousAnalytics";

describe("AnonymousAnalytics", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    (analytics as any).isOnline = true;
    (analytics as any).remoteUrl = null;
  });

  afterEach(() => {
    fetchSpy?.mockRestore();
  });

  it("tracks an event and persists to localStorage", () => {
    analytics.setRemoteUrl("https://example.com/analytics");
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);

    analytics.track("page_view", { page: "home" });

    const pending = JSON.parse(localStorage.getItem("stockstory_analytics_pending")!);
    expect(pending).toHaveLength(1);
    expect(pending[0].event).toBe("page_view");
    expect(pending[0].metadata?.page).toBe("home");
  });

  it("queues events offline without fetching", () => {
    (analytics as any).isOnline = false;
    analytics.setRemoteUrl("https://example.com/analytics");
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    analytics.track("event1");
    analytics.track("event2");

    const pending = JSON.parse(localStorage.getItem("stockstory_analytics_pending")!);
    expect(pending).toHaveLength(2);
  });

  it("flushes pending events on setRemoteUrl + track", async () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    analytics.setRemoteUrl("https://example.com/analytics");

    analytics.track("test_event");

    expect(fetchSpy).toHaveBeenCalled();

    await new Promise((r) => setTimeout(r, 0));

    const pending = localStorage.getItem("stockstory_analytics_pending");
    expect(pending).toBeNull();
  });

  it("does not flush without a remote url", () => {
    fetchSpy = vi.spyOn(globalThis, "fetch");

    analytics.track("orphaned");

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("handles non-ok response correctly", () => {
    fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false } as Response);
    analytics.setRemoteUrl("https://example.com/analytics");

    analytics.track("fail_event");

    expect(fetchSpy).toHaveBeenCalled();

    const pending = JSON.parse(localStorage.getItem("stockstory_analytics_pending")!);
    expect(pending).toHaveLength(1);
  });

  it("exports a pre-initialised instance", () => {
    expect(analytics.track).toBeTypeOf("function");
    expect(analytics.setRemoteUrl).toBeTypeOf("function");
  });
});
