import { afterEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";

const envSnapshot = { ...process.env };

async function buildApp() {
  // Dynamic import so env is set before module evaluates
  const { default: upstoxRoutes } = await import("../upstox");
  const app = Fastify({ logger: false });
  await app.register(upstoxRoutes);
  await app.ready();
  return app;
}

afterEach(() => {
  process.env = { ...envSnapshot };
  vi.unstubAllEnvs();
});

describe("Upstox provider routes — security", () => {
  it("GET /api/providers/upstox/status never exposes token value", async () => {
    process.env.UPSTOX_ACCESS_TOKEN = "super-secret-token-123";
    process.env.UPSTOX_API_KEY = "api-key-123";
    process.env.UPSTOX_CLIENT_SECRET = "client-secret-456";

    const app = await buildApp();
    const response = await app.inject({ method: "GET", url: "/api/providers/upstox/status" });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.tokenPresent).toBe(true);
    expect(body.tokenState).toBe("present");
    expect(body.apiKeyConfigured).toBe(true);
    expect(body.clientSecretConfigured).toBe(true);
    expect(JSON.stringify(body)).not.toContain("super-secret-token");
    expect(JSON.stringify(body)).not.toContain("client-secret");
    expect(JSON.stringify(body)).not.toContain("api-key-123");

    await app.close();
  });

  it("POST /api/providers/upstox/token/request strips carriage returns from env vars", async () => {
    process.env.UPSTOX_API_KEY = "api-key-with-cr\r";
    process.env.UPSTOX_REDIRECT_URI = "https://example.com/callback";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/providers/upstox/token/request",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.authUrl).not.toContain("%0D");
    expect(body.authUrl).toContain("client_id=api-key-with-cr");
    expect(body.authUrl).toContain("state=");
    expect(body.status).toBe("requested");

    await app.close();
  });

  it("POST /api/providers/upstox/token/request generates a non-zero random state", async () => {
    process.env.UPSTOX_API_KEY = "api-key";

    const app = await buildApp();
    const response1 = await app.inject({ method: "POST", url: "/api/providers/upstox/token/request" });
    const response2 = await app.inject({ method: "POST", url: "/api/providers/upstox/token/request" });

    const state1 = new URL(response1.json().authUrl).searchParams.get("state");
    const state2 = new URL(response2.json().authUrl).searchParams.get("state");

    expect(state1).toBeDefined();
    expect(state1).not.toBe("0000000000000000000000000000000000000000000000000000000000000000");
    expect(state1).not.toBe(state2);

    await app.close();
  });

  it("POST /api/providers/upstox/token/callback rejects invalid notifier secret", async () => {
    process.env.UPSTOX_NOTIFIER_SECRET = "expected-secret";

    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/providers/upstox/token/callback?code=abc&secret=wrong-secret",
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.status).toBe("rejected");
    expect(JSON.stringify(body)).not.toContain("expected-secret");

    await app.close();
  });

  it("POST /api/providers/upstox/token/callback never echoes the code", async () => {
    const app = await buildApp();
    const response = await app.inject({
      method: "POST",
      url: "/api/providers/upstox/token/callback?code=super-secret-code-123",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(JSON.stringify(body)).not.toContain("super-secret-code");

    await app.close();
  });
});
