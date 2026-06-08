import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("loadEnv", () => {
  it("parses extra allowed origins, trims whitespace, and removes duplicates", async () => {
    process.env.NODE_ENV = "production";
    process.env.COOKIE_SECRET = "prod-secret";
    process.env.EXTRA_ALLOWED_ORIGINS = "https://preview.example.com, https://admin.example.com,https://preview.example.com, ";

    const { loadEnv } = await import("./env");
    const env = loadEnv();

    expect(env.allowedOrigins).toContain("https://stockstory-india.com");
    expect(env.allowedOrigins).toContain("https://preview.example.com");
    expect(env.allowedOrigins).toContain("https://admin.example.com");
    expect(env.allowedOrigins.filter((origin) => origin === "https://preview.example.com")).toHaveLength(1);
    expect(env.allowedOrigins).not.toContain("http://localhost:5174");
  });

  it("uses development fallback secret and localhost origins outside production", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.COOKIE_SECRET;

    const { loadEnv } = await import("./env");
    const env = loadEnv();

    expect(env.cookieSecret).toBe("dev-secret-changeme");
    expect(env.allowedOrigins).toContain("http://localhost:5174");
  });

  it("requires COOKIE_SECRET in production", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.COOKIE_SECRET;
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { loadEnv } = await import("./env");
    expect(() => loadEnv()).toThrow("process.exit called");
    expect(exit).toHaveBeenCalledWith(1);
  });
});
