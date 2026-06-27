import type { IncomingMessage, ServerResponse } from "node:http";

interface ProviderStatus {
  configured: boolean;
  status: "healthy" | "degraded" | "unavailable" | "not_configured";
  latencyMs: number | null;
  message: string;
}

interface HealthCheck {
  overall: "ok" | "degraded" | "unhealthy";
  uptime: string;
  providers: Record<string, ProviderStatus>;
  endpoints: Record<string, string>;
  build: { modules: string; node: string; timestamp: string };
}

async function checkUrl(url: string, timeoutMs = 5000): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "StockStory-HealthCheck/1.0" },
    });
    clearTimeout(timeout);
    return { ok: response.ok || response.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}

function assessProvider(configured: boolean, ok: boolean | null, latencyMs: number | null): ProviderStatus {
  if (!configured) return { configured: false, status: "not_configured", latencyMs: null, message: "API key or credentials not set" };
  if (ok === null) return { configured: true, status: "degraded", latencyMs: null, message: "Could not verify connectivity" };
  if (!ok) return { configured: true, status: "unavailable", latencyMs, message: `Provider unreachable (${latencyMs}ms)` };
  if (latencyMs && latencyMs > 3000) return { configured: true, status: "degraded", latencyMs, message: `Slow response (${latencyMs}ms)` };
  return { configured: true, status: "healthy", latencyMs, message: `Responding in ${latencyMs}ms` };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const startTime = Date.now();

  // Check environment variables
  const indianApiConfigured = !!(process.env.INDIANAPI_KEY || process.env.INDIANAPI_PREMIUM_KEY);
  const upstoxConfigured = !!(process.env.UPSTOX_ACCESS_TOKEN || process.env.UPSTOX_API_KEY);
  const screenerConfigured = process.env.VITE_SCREENER_ENABLED === "true";
  const yahooConfigured = true; // Always available as proxy

  // Ping external providers (non-blocking, parallel)
  const [indianApiResult, upstoxResult, yahooResult] = await Promise.allSettled([
    indianApiConfigured
      ? checkUrl("https://api.indianapi.in/health", 4000)
      : Promise.resolve({ ok: null as unknown as boolean, latencyMs: null as unknown as number }),
    upstoxConfigured
      ? checkUrl("https://api.upstox.com/v2/market/status", 4000)
      : Promise.resolve({ ok: null as unknown as boolean, latencyMs: null as unknown as number }),
    checkUrl("https://query1.finance.yahoo.com/v8/finance/chart/RELIANCE.NS?range=1d&interval=1d", 5000),
  ]);

  const iResult = indianApiResult.status === "fulfilled" ? indianApiResult.value : { ok: false, latencyMs: 0 };
  const uResult = upstoxResult.status === "fulfilled" ? upstoxResult.value : { ok: false, latencyMs: 0 };
  const yResult = yahooResult.status === "fulfilled" ? yahooResult.value : { ok: false, latencyMs: 0 };

  const providers: Record<string, ProviderStatus> = {
    indianapi: assessProvider(indianApiConfigured, iResult.ok, iResult.latencyMs),
    upstox: assessProvider(upstoxConfigured, uResult.ok, uResult.latencyMs),
    yahoo_finance: assessProvider(yahooConfigured, yResult.ok, yResult.latencyMs),
    screener: {
      configured: screenerConfigured,
      status: screenerConfigured ? "degraded" : "not_configured",
      latencyMs: null,
      message: screenerConfigured
        ? "Enabled (HTML scraping — no dedicated health endpoint)"
        : "Disabled — enable with VITE_SCREENER_ENABLED=true",
    },
    nse_bse_ingestion: {
      configured: true,
      status: "healthy",
      latencyMs: null,
      message: "NSE equity master CSV ingestion available at scripts/ingest-official-stocks.ts",
    },
  };

  const providerStatuses = Object.values(providers).map((p) => p.status);
  const criticalFailed = ["indianapi", "yahoo_finance"].some(
    (key) => providers[key].status === "unavailable",
  );

  const overall = criticalFailed
    ? "unhealthy"
    : providerStatuses.some((s) => s === "unavailable")
      ? "degraded"
      : "ok";

  const health: HealthCheck = {
    overall,
    uptime: `${Math.round((Date.now() - startTime) / 1000)}s total check time`,
    providers,
    endpoints: {
      stock: "/api/stock?symbol=TCS",
      financials: "/api/financials/TCS",
      historical: "/api/historical/TCS?range=1mo",
      search: "/api/search?q=RELIANCE",
      news: "/api/news/TCS",
      ingest_nifty50: "/api/ingest/nifty50",
    },
    build: {
      modules: "production",
      node: process.version,
      timestamp: new Date().toISOString(),
    },
  };

  const statusCode = overall === "ok" ? 200 : overall === "degraded" ? 200 : 503;
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
  });
  res.end(JSON.stringify(health));
}
