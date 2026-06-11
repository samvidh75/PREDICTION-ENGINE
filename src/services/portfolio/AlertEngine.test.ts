import { beforeEach, describe, expect, it, vi } from "vitest";
import { AlertEngine, type SmartAlert } from "./AlertEngine";
import { authenticatedFetchOnlyIfSignedIn } from "../auth/authenticatedFetch";

vi.mock("../auth/authenticatedFetch", () => ({
  authenticatedFetchOnlyIfSignedIn: vi.fn(),
}));

vi.mock("../diagnostics/AnalyticsCoordinator", () => ({
  AnalyticsCoordinator: {
    trackEvent: vi.fn(),
  },
}));

const mockedAuthenticatedFetch = vi.mocked(authenticatedFetchOnlyIfSignedIn);

const sessionKey = "ss_auth_session_v1";

function setSession(uid?: string): void {
  if (!uid) {
    window.localStorage.removeItem(sessionKey);
    return;
  }
  window.localStorage.setItem(sessionKey, JSON.stringify({
    status: "authenticated",
    uid,
    createdAtMs: Date.now(),
  }));
}

function resetAlertEngineSync(): void {
  (AlertEngine as unknown as { isInitialSyncStarted: boolean }).isInitialSyncStarted = false;
}

function alert(overrides: Partial<SmartAlert> = {}): SmartAlert {
  return {
    id: "alert-1",
    category: "Risk",
    title: "Risk changed",
    body: "Risk moved",
    timestamp: "2026-06-10T10:00:00.000Z",
    symbol: "TCS",
    isRead: false,
    ...overrides,
  };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("AlertEngine authenticated persistence", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
    resetAlertEngineSync();
    mockedAuthenticatedFetch.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  it("loads authenticated remote alerts through the auth helper and merges by timestamp", async () => {
    setSession("user-a");
    const localOlder = alert({ id: "shared", title: "local older", timestamp: "2026-06-10T09:00:00.000Z" });
    const remoteNewer = alert({ id: "shared", title: "remote newer", timestamp: "2026-06-10T11:00:00.000Z", isRead: true });
    const remoteOnly = alert({ id: "remote-only", title: "remote only", timestamp: "2026-06-10T12:00:00.000Z" });
    window.localStorage.setItem("stockstory_alerts_v2_user-a", JSON.stringify([localOlder]));
    mockedAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ alerts: [remoteNewer, remoteOnly] }),
    } as unknown as Response);

    expect(AlertEngine.getAlerts()).toEqual([localOlder]);
    await flushPromises();

    expect(mockedAuthenticatedFetch).toHaveBeenCalledWith("/api/alerts");
    const merged = AlertEngine.getAlerts();
    expect(merged.map(item => item.id)).toEqual(["remote-only", "shared"]);
    expect(merged.find(item => item.id === "shared")?.title).toBe("remote newer");
  });

  it("creates authenticated alerts through the auth helper without UID query parameters", async () => {
    setSession("user-a");
    mockedAuthenticatedFetch.mockResolvedValue({ ok: true } as Response);

    AlertEngine.generateAlert("Risk", "TCS", "Risk changed", "Risk moved");
    await flushPromises();

    const createCall = mockedAuthenticatedFetch.mock.calls.find(call => call[0] === "/api/alerts" && call[1]?.method === "POST");
    expect(createCall).toBeTruthy();
    const [url, options] = createCall!;
    expect(String(url)).not.toContain("uid=");
    expect(JSON.stringify(options)).not.toContain("user-a");
    expect(JSON.parse(String(options?.body))).toEqual({
      category: "Risk",
      title: "Risk changed",
      body: "Risk moved",
      symbol: "TCS",
    });
  });

  it("keeps unauthenticated users local-only", async () => {
    setSession(undefined);
    mockedAuthenticatedFetch.mockResolvedValue(null);
    const localAlert = alert({ id: "local-only" });

    AlertEngine.saveAlerts([localAlert]);
    await flushPromises();

    expect(AlertEngine.getAlerts()).toEqual([localAlert]);
    expect(mockedAuthenticatedFetch).not.toHaveBeenCalled();
  });

  it("does not trust a forged local UID for remote identity", async () => {
    setSession("forged-user-b");
    mockedAuthenticatedFetch.mockResolvedValue({ ok: true } as Response);

    AlertEngine.generateAlert("Risk", "TCS", "Forged attempt", "Body");
    await flushPromises();

    const [url, options] = mockedAuthenticatedFetch.mock.calls.find(call => call[0] === "/api/alerts" && call[1]?.method === "POST")!;
    expect(url).toBe("/api/alerts");
    expect(String(url)).not.toContain("forged-user-b");
    expect(JSON.stringify(options)).not.toContain("forged-user-b");
  });

  it("isolates alert settings per local authenticated account", () => {
    setSession("user-a");
    AlertEngine.setCategoryStatus("Risk", false);

    setSession("user-b");
    expect(AlertEngine.isCategoryEnabled("Risk")).toBe(true);
    AlertEngine.setCategoryStatus("Risk", true);

    setSession("user-a");
    expect(AlertEngine.isCategoryEnabled("Risk")).toBe(false);
  });

  it("preserves local alerts when remote sync fails", async () => {
    setSession("user-a");
    const localAlert = alert({ id: "preserve-me" });
    window.localStorage.setItem("stockstory_alerts_v2_user-a", JSON.stringify([localAlert]));
    mockedAuthenticatedFetch.mockResolvedValue({ ok: false, status: 503 } as Response);

    const before = AlertEngine.getAlerts();
    await flushPromises();
    const after = AlertEngine.getAlerts();

    expect(before).toEqual([localAlert]);
    expect(after).toEqual([localAlert]);
    expect(console.warn).toHaveBeenCalledWith("[AlertEngine] remote_sync_failed", expect.objectContaining({
      component: "AlertEngine",
      operation: "load",
      status: 503,
    }));
  });

  it("parses canonical backend alert response shape", async () => {
    setSession("user-a");
    mockedAuthenticatedFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        alerts: [{
          id: 42,
          alert_type: "risk",
          title: "Backend alert",
          body: "Backend body",
          created_at: "2026-06-11T10:00:00.000Z",
          symbol: "TCS",
          is_read: 0,
        }],
        unreadCount: 1,
      }),
    } as unknown as Response);

    expect(AlertEngine.getAlerts()).toEqual([]);
    await flushPromises();

    expect(AlertEngine.getAlerts()).toEqual([expect.objectContaining({
      id: "42",
      category: "Risk",
      title: "Backend alert",
      isRead: false,
    })]);
  });
});
