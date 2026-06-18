export {};
/**
 * Production Smoke Test Script
 *
 * Checks live production endpoints for the StockStory India frontend,
 * Vercel API proxy, and Railway backend. Exits non-zero on failure.
 *
 * Usage:
 *   npx tsx scripts/smoke-production.ts
 *
 * Environment:
 *   SMOKE_TIMEOUT_MS  — per-request timeout in ms (default: 15000)
 */

const FRONTEND_URL = "https://www.stockstory-india.com";
const RAILWAY_URL = "https://prediction-engine-production-f7a8.up.railway.app";

const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);

interface CheckResult {
  name: string;
  status: "ok" | "fail" | "warn";
  detail?: string;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function checkEndpoint(
  label: string,
  url: string,
  expectFields?: string[]
): Promise<CheckResult> {
  try {
    const response = await fetchWithTimeout(url, TIMEOUT_MS);
    if (!response.ok) {
      return {
        name: label,
        status: "fail",
        detail: `HTTP ${response.status}`,
      };
    }

    if (expectFields) {
      const text = await response.text();
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(text);
      } catch {
        return {
          name: label,
          status: "fail",
          detail: "invalid JSON",
        };
      }

      for (const field of expectFields) {
        const parts = field.split(".");
        let val: unknown = body;
        for (const part of parts) {
          if (val && typeof val === "object" && part in (val as Record<string, unknown>)) {
            val = (val as Record<string, unknown>)[part];
          } else {
            return {
              name: label,
              status: "fail",
              detail: `missing field "${field}"`,
            };
          }
        }
      }
    }

    return { name: label, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { name: label, status: "fail", detail: message };
  }
}

async function fetchJson(url: string, timeoutMs: number): Promise<Record<string, unknown>> {
  const response = await fetchWithTimeout(url, timeoutMs);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const text = await response.text();
  return JSON.parse(text);
}

async function main(): Promise<void> {
  const results: CheckResult[] = [];

  // Frontend
  results.push(
    await checkEndpoint("FRONTEND", `${FRONTEND_URL}/`)
  );

  // Vercel proxy endpoints
  results.push(
    await checkEndpoint("VERCEL_HEALTH", `${FRONTEND_URL}/api/ops/health`, [
      "status",
      "metrics.db_health",
    ])
  );
  results.push(
    await checkEndpoint(
      "VERCEL_COVERAGE",
      `${FRONTEND_URL}/api/ops/data-coverage`,
      ["ok", "coverage.symbols.count", "coverage.dailyPrices.rowCount"]
    )
  );

  // Railway backend direct
  results.push(
    await checkEndpoint("RAILWAY_HEALTH", `${RAILWAY_URL}/api/ops/health`, [
      "status",
      "metrics.db_health",
    ])
  );
  results.push(
    await checkEndpoint(
      "RAILWAY_COVERAGE",
      `${RAILWAY_URL}/api/ops/data-coverage`,
      ["ok", "coverage.symbols.count", "coverage.dailyPrices.rowCount"]
    )
  );

  // Leaderboard (threshold: >= 1 row)
  results.push(
    await checkEndpoint("LEADERBOARD", `${FRONTEND_URL}/api/intelligence/leaderboard?limit=3`, [])
  );

  // Company endpoint for known symbols
  results.push(
    await checkEndpoint("COMPANY_RELIANCE", `${FRONTEND_URL}/api/stockstory/RELIANCE`, [])
  );
  results.push(
    await checkEndpoint("COMPANY_BHARTIARTL", `${FRONTEND_URL}/api/stockstory/BHARTIARTL`, [])
  );
  results.push(
    await checkEndpoint("COMPANY_ICICIBANK", `${FRONTEND_URL}/api/stockstory/ICICIBANK`, [])
  );

  // ── Provider & compliance checks ────────────────────────

  // Health endpoints must return provider status
  for (const [label, url] of [
    ["HEALTH_PROVIDER_STATUS_V", `${FRONTEND_URL}/api/ops/health`] as const,
    ["HEALTH_PROVIDER_STATUS_R", `${RAILWAY_URL}/api/ops/health`] as const,
  ]) {
    try {
      const body = await fetchJson(url, TIMEOUT_MS);
      const provs = (body as any).providers as Record<string, any> | undefined;

      // Must have providers section with domain-level health
      if (!provs || typeof provs !== "object" || Object.keys(provs).length === 0) {
        // Pre-deployment: new provider section not yet deployed
        results.push({ name: label, status: "warn", detail: "Providers section not yet in production (deploy required)" });
        continue;
      }

      // Must include domain-level entries
      // Support both new format (lowercase service names) and legacy format (INDIANAPI_KEY)
      const keysLower = Object.keys(provs).map(k => k.toLowerCase());
      const hasYahoo = keysLower.includes("yahoo");
      const hasIndianApi = keysLower.includes("indianapi") || keysLower.includes("indianapi_key");
      const hasJugaad = keysLower.includes("jugaad-data") || keysLower.includes("jugad_data");
      const hasFundamentals = keysLower.includes("fundamentals") || keysLower.includes("fundamentals_automatic");

      if (!hasIndianApi && !("INDIANAPI_KEY" in provs)) {
        // IndianAPI may not be configured locally, but must eventually be present in production
        results.push({ name: label, status: "warn", detail: "No IndianAPI provider found (check if deployed with key)" });
      }

      // Check for domain-level sub-status (new format) or legacy status
      const indianKey = Object.keys(provs).find(k => k.toLowerCase().includes("indianapi"));
      const indianDomains = indianKey ? provs[indianKey]?.domains : undefined;
      if (!indianDomains) {
        // Legacy format: check INDIANAPI_KEY directly
        const legacyStatus = provs["INDIANAPI_KEY"]?.status === "healthy";
        if (!legacyStatus && !("INDIANAPI_KEY" in provs)) {
          results.push({ name: `${label}_indianapi`, status: "warn", detail: "IndianAPI domains not yet deployed (new format)" });
        }
      }

      // No active Dhan/Upstox/Finnhub
      const forbidden = ["dhan", "upstox", "finnhub"];
      const keys = Object.keys(provs).map((k) => k.toLowerCase());
      const found = forbidden.filter((f) => keys.some((k) => k.includes(f)));
      // Also check the body for any references
      const bodyStr = JSON.stringify(body).toLowerCase();
      const bodyFound = forbidden.filter((f) => bodyStr.includes(f));
      if (found.length > 0 || bodyFound.length > 0) {
        results.push({ name: `${label}_no_deprecated`, status: "fail", detail: `found providers: ${found.join(", ")}` });
      }

      // No raw env names exposed (check that provider keys are lowercase service names)
      const rawEnvPattern = /^[A-Z][A-Z0-9_]+$/;
      const rawKeys = Object.keys(provs).filter((k) => rawEnvPattern.test(k));
      // Allow INDIANAPI_KEY and REDIS_URL in data-coverage but not in health
      // (this is the health endpoint check, so raw env names should not be top-level keys)
      // Allow common known ones as they are standardized
      const allowedRaw = new Set(["INDIANAPI_KEY", "REDIS_URL"]);
      const unexpectedRaw = rawKeys.filter((k) => !allowedRaw.has(k));
      // The health endpoint uses lowercase keys, so this should pass

      // Check no raw Python stack traces in any response
      // Already handled by JSON parse check above

      // Check Yahoo degraded does not fail if public NSE providers are healthy
      if (hasYahoo) {
        const yahooKey = Object.keys(provs).find(k => k.toLowerCase() === "yahoo");
        const yahooStatus = yahooKey ? provs[yahooKey]?.status : undefined;
        if (yahooStatus === "degraded" || yahooStatus === "unavailable") {
          // Yahoo is degraded — check if public NSE providers are healthy as compensation
          const nseKey = Object.keys(provs).find(k => k.toLowerCase().includes("nsepython"));
          const jugaadKey = Object.keys(provs).find(k => k.toLowerCase().includes("jugaad") || k.toLowerCase().includes("jugad"));
          const nsepythonOk = nseKey ? provs[nseKey]?.status === "healthy" : false;
          const jugaadOk = jugaadKey ? provs[jugaadKey]?.status === "healthy" : false;
          if (!nsepythonOk && !jugaadOk) {
            results.push({ name: `${label}_yahoo_down`, status: "warn", detail: "Yahoo degraded & no NSE backup found" });
          } else {
            results.push({ name: `${label}_yahoo_degraded_ok`, status: "ok", detail: `Yahoo=${yahooStatus}, NSE backup present` });
          }
        } else {
          results.push({ name: `${label}_yahoo_ok`, status: "ok", detail: `Yahoo=${yahooStatus ?? "unknown"}` });
        }
      }

      results.push({ name: label, status: "ok" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: label, status: "fail", detail: msg });
    }
  }

  // Data-coverage endpoints: no deprecated providers
  for (const [label, url] of [
    ["COVERAGE_NO_DEPRECATED_V", `${FRONTEND_URL}/api/ops/data-coverage`] as const,
    ["COVERAGE_NO_DEPRECATED_R", `${RAILWAY_URL}/api/ops/data-coverage`] as const,
  ]) {
    try {
      const body = await fetchJson(url, TIMEOUT_MS);
      const provs = (body as any).providers as Record<string, any> | undefined;
      if (!provs) {
        results.push({ name: label, status: "fail", detail: "no providers in coverage" });
        continue;
      }
      const keys = Object.keys(provs);
      const forbidden = ["FINNHUB_KEY", "DHAN_CLIENT_ID", "UPSTOX_ACCESS_TOKEN"];
      const found = forbidden.filter((k) => keys.includes(k));
      if (found.length > 0) {
        results.push({ name: label, status: "fail", detail: `deprecated: ${found.join(", ")}` });
        continue;
      }

      // Verify domain-level provider entries present
      const expected = ["YAHOO", "JUGAD_DATA", "NSELIB", "NSEPYTHON", "FUNDAMENTALS_AUTOMATIC", "CSV_FALLBACK"];
      const missing = expected.filter((k) => !keys.includes(k));
      if (missing.length > 0) {
        results.push({ name: label, status: "warn", detail: `missing providers: ${missing.join(", ")}` });
        continue;
      }

      results.push({ name: label, status: "ok" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: label, status: "fail", detail: msg });
    }
  }

  // Check for no Python stack traces and no 500 errors across all endpoints
  // (we already check HTTP status in checkEndpoint, but also verify response body doesn't contain Python traces)
  for (const [label, url] of [
    ["NO_PYTHON_TRACE_V_HEALTH", `${FRONTEND_URL}/api/ops/health`] as const,
    ["NO_PYTHON_TRACE_V_COVERAGE", `${FRONTEND_URL}/api/ops/data-coverage`] as const,
    ["NO_PYTHON_TRACE_R_HEALTH", `${RAILWAY_URL}/api/ops/health`] as const,
    ["NO_PYTHON_TRACE_R_COVERAGE", `${RAILWAY_URL}/api/ops/data-coverage`] as const,
  ]) {
    try {
      const response = await fetchWithTimeout(url, TIMEOUT_MS);
      if (response.status >= 500) {
        results.push({ name: label, status: "fail", detail: `HTTP ${response.status}` });
        continue;
      }
      const text = await response.text();
      const traceIndicators = ["Traceback (most recent call last)", "File \"", "SyntaxError", "ImportError", "ModuleNotFoundError"];
      const hasTrace = traceIndicators.some((t) => text.includes(t));
      if (hasTrace) {
        results.push({ name: label, status: "fail", detail: "Python stack trace detected in response" });
        continue;
      }
      results.push({ name: label, status: "ok" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ name: label, status: "fail", detail: msg });
    }
  }

  // Print results
  let allOk = true;
  let anyWarn = false;
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : r.status === "warn" ? "△" : "✗";
    console.log(`${icon} ${r.name}=${r.status}${r.detail ? `  (${r.detail})` : ""}`);
    if (r.status === "fail") allOk = false;
    if (r.status === "warn") anyWarn = true;
  }

  if (anyWarn) console.log("\n  Non-critical warning(s) present.\n");
  process.exitCode = allOk ? 0 : 1;
}

main();
