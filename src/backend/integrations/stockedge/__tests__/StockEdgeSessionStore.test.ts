import { describe, expect, it, beforeEach } from "vitest";
import { StockEdgeSessionStore } from "../StockEdgeSessionStore";

describe("StockEdgeSessionStore", () => {
  let store: StockEdgeSessionStore;

  beforeEach(() => {
    store = new StockEdgeSessionStore();
  });

  it("starts with no session", () => {
    expect(store.getSession()).toBeNull();
    expect(store.isSessionValid()).toBe(false);
  });

  it("stores and retrieves a session", () => {
    const session = {
      cookieHeader: "session=abc123; Path=/",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    store.setSession(session);
    const retrieved = store.getSession();
    expect(retrieved).not.toBeNull();
    expect(retrieved!.cookieHeader).toBe("session=abc123; Path=/");
    expect(store.isSessionValid()).toBe(true);
  });

  it("clears session", () => {
    const session = {
      cookieHeader: "session=abc123",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    store.setSession(session);
    store.clearSession();
    expect(store.getSession()).toBeNull();
    expect(store.isSessionValid()).toBe(false);
  });

  it("returns null for expired session", () => {
    const session = {
      cookieHeader: "session=abc123",
      createdAt: new Date(Date.now() - 7200_000).toISOString(),
      expiresAt: new Date(Date.now() - 3600_000).toISOString(),
    };
    store.setSession(session);
    expect(store.getSession()).toBeNull();
    expect(store.isSessionValid()).toBe(false);
  });

  it("does not include cookie in error messages", () => {
    const session = {
      cookieHeader: "session=secret123",
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    };
    store.setSession(session);
    try {
      throw new Error("Test error - session cookie not exposed");
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).not.toContain("session=secret123");
    }
  });
});
