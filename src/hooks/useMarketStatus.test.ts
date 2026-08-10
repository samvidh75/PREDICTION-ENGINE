import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMarketStatus } from "./useMarketStatus";
import { MarketHours } from "../services/market/MarketHours";

/**
 * useMarketStatus — holiday-aware hybrid hook.
 *
 * The session ladder is client-computed from MarketHours; the holiday flag
 * comes from a once-per-PHT-day fetch against /api/market-status. These
 * tests stub that fetch and verify the override, fallback, and dedupe paths.
 */

/** Stub global fetch to return a market-status payload. `status` null → reject. */
function mockStatusFetch(status: string | null) {
  const fn = vi.fn();
  if (status === null) {
    fn.mockRejectedValue(new Error("network down"));
  } else {
    fn.mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, status }),
    });
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}

function flush() {
  return act(async () => {
    await Promise.resolve();
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useMarketStatus", () => {
  it("overrides to 'holiday' when the server calendar reports a PSE holiday", async () => {
    mockStatusFetch("holiday");
    const { result } = renderHook(() => useMarketStatus());

    await waitFor(() => expect(result.current.session).toBe("holiday"));
    expect(result.current.label).toBe("Market closed");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.detail).toContain("holiday");
  });

  it("keeps the client-computed session when the server reports a trading day", async () => {
    mockStatusFetch("open");
    const expectedSession = MarketHours.getStatus(new Date());
    const { result } = renderHook(() => useMarketStatus());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await flush();

    expect(result.current.session).toBe(expectedSession);
    expect(result.current.session).not.toBe("holiday");
  });

  it("falls back to the client ladder when the status fetch fails", async () => {
    mockStatusFetch(null);
    const expectedSession = MarketHours.getStatus(new Date());
    const { result } = renderHook(() => useMarketStatus());

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalledTimes(1));
    await flush();

    expect(result.current.session).toBe(expectedSession);
    expect(result.current.session).not.toBe("holiday");
    expect(result.current.isOpen).toBe(expectedSession === "open");
  });

  it("fetches the holiday flag only once per PHT day", async () => {
    const fetchMock = mockStatusFetch("open");
    const { result } = renderHook(() => useMarketStatus());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await flush();

    // Tab return triggers a status re-check, but the calendar was already
    // resolved for today — no second network call.
    act(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.session).not.toBe("holiday");
  });

  it("appends a live 'closes in' countdown while the market is open", async () => {
    // 2026-08-05 is a Wednesday; 02:00 UTC = 10:00 AM PHT (trading window).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T02:00:00Z"));
    mockStatusFetch("open");

    const { result } = renderHook(() => useMarketStatus());
    await flush();

    expect(result.current.session).toBe("open");
    expect(result.current.isOpen).toBe(true);
    // 15:30 − 10:00 = 5h 30m
    expect(result.current.detail).toContain("closes in 5h 30m");
  });

  it("leaves closed-state details without a countdown", async () => {
    // 07:45 UTC = 3:45 PM PHT → session ended (closing).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T07:45:00Z"));
    mockStatusFetch("open");

    const { result } = renderHook(() => useMarketStatus());
    await flush();

    expect(result.current.session).toBe("closing");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.detail).not.toContain("closes in");
  });
});
