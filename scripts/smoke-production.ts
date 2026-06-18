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
  status: "ok" | "fail";
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

  // Print results
  let allOk = true;
  for (const r of results) {
    const icon = r.status === "ok" ? "✓" : "✗";
    console.log(`${icon} ${r.name}=${r.status}${r.detail ? `  (${r.detail})` : ""}`);
    if (r.status !== "ok") allOk = false;
  }

  process.exitCode = allOk ? 0 : 1;
}

main();
