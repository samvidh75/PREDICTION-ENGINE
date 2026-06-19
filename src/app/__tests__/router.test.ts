import { describe, expect, it } from "vitest";
import { sanitizeReturnTo, getReturnToContext } from "../router";

describe("sanitizeReturnTo", () => {
  it("allows valid relative query-param URLs", () => {
    expect(sanitizeReturnTo("?page=stock&id=RELIANCE")).toBe("?page=stock&id=RELIANCE");
    expect(sanitizeReturnTo("?page=dashboard")).toBe("?page=dashboard");
    expect(sanitizeReturnTo("?page=portfolio&tab=holdings")).toBe("?page=portfolio&tab=holdings");
  });

  it("rejects null or empty input", () => {
    expect(sanitizeReturnTo(null)).toBeNull();
    expect(sanitizeReturnTo("")).toBeNull();
  });

  it("rejects external URLs with protocol", () => {
    expect(sanitizeReturnTo("https://evil.com/phish")).toBeNull();
    expect(sanitizeReturnTo("http://malicious.site")).toBeNull();
  });

  it("rejects double-slash URLs", () => {
    expect(sanitizeReturnTo("//evil.com")).toBeNull();
  });

  it("rejects URLs with special characters", () => {
    expect(sanitizeReturnTo("?page=stock&id=<script>")).toBeNull();
    expect(sanitizeReturnTo('?page=stock&id="test"')).toBeNull();
  });

  it("rejects absolute paths", () => {
    expect(sanitizeReturnTo("/dashboard")).toBeNull();
    expect(sanitizeReturnTo("/api/data")).toBeNull();
  });
});

describe("getReturnToContext", () => {
  it("returns stock context for company page", () => {
    const msg = getReturnToContext("?page=stock&id=RELIANCE");
    expect(msg).toBe("Sign in to continue researching RELIANCE.");
  });

  it("returns portfolio context", () => {
    const msg = getReturnToContext("?page=portfolio");
    expect(msg).toBe("Sign in to view your portfolio.");
  });

  it("returns watchlist context", () => {
    const msg = getReturnToContext("?page=watchlist");
    expect(msg).toBe("Sign in to manage your watchlist.");
  });

  it("returns dashboard context", () => {
    const msg = getReturnToContext("?page=dashboard");
    expect(msg).toBe("Sign in to access your dashboard.");
  });

  it("returns null for no returnTo", () => {
    expect(getReturnToContext(null)).toBeNull();
  });

  it("returns null for empty returnTo", () => {
    expect(getReturnToContext("")).toBeNull();
  });
});
