import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env.local", quiet: true });

export {};
/**
 * check-upstox-token.ts
 *
 * Safe Upstox access token diagnostic.
 * Does NOT print token value. Does NOT save raw response payload.
 * Exits 0 if valid, non-zero if expired/missing/network error.
 *
 * Uses LTP market-quote endpoint (works with both OAuth tokens and Analytics Tokens).
 * Analytics Token does NOT support /user/profile (requires Static IP).
 *
 * Usage:
 *   npx tsx scripts/check-upstox-token.ts
 *
 * Environment:
 *   UPSTOX_ACCESS_TOKEN  — Upstox access token (OAuth or Analytics Token)
 */

const TIMEOUT = parseInt(process.env.CHECK_TIMEOUT_MS || "10000", 10);
const UPSTOX_API = "https://api.upstox.com/v2";

type TokenStatus = "present" | "missing" | "valid" | "expired" | "unauthorized" | "network_error" | "provider_error" | "unknown";

const exitCode = 0;

function tokenStatusLabel(status: TokenStatus, extra?: string): string {
  const labels: Record<TokenStatus, string> = {
    present: "present",
    missing: "missing",
    valid: "valid",
    expired: "expired",
    unauthorized: "unauthorized",
    network_error: "network_error",
    provider_error: "provider_error",
    unknown: "unknown",
  };
  const label = labels[status] ?? "unknown";
  return extra ? `${label} (${extra})` : label;
}

async function main(): Promise<void> {
  const token = process.env.UPSTOX_ACCESS_TOKEN;

  if (!token) {
    console.log("UPSTOX_TOKEN=missing");
    console.log("UPSTOX_STATUS=missing  (token env var not set)");
    console.log("UPSTOX_HTTP_STATUS=N/A");
    console.log("SAFE_MESSAGE=Upstox access token is not configured.");
    process.exit(1);
  }

  console.log("UPSTOX_TOKEN=present");
  console.log("UPSTOX_STATUS=checking...");

  // Use LTP market quote endpoint (works with both OAuth tokens and Analytics Tokens)
  // Analytics Token does NOT support /user/profile (requires Static IP)
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const response = await fetch(`${UPSTOX_API}/market-quote/ltp?instrument_key=NSE_EQ%7CIEODI0001210`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    const httpStatus = response.status;

    if (response.ok) {
      console.log(`UPSTOX_STATUS=valid`);
      console.log(`UPSTOX_HTTP_STATUS=${httpStatus}`);
      console.log("SAFE_MESSAGE=Upstox access token is valid.");
      process.exit(0);
    } else if (httpStatus === 401) {
      console.log("UPSTOX_STATUS=expired");
      console.log(`UPSTOX_HTTP_STATUS=${httpStatus}`);
      console.log("SAFE_MESSAGE=Upstox access token is expired. Generate a new Analytics Token from https://account.upstox.com/developer/apps#analytics");
      process.exit(2);
    } else if (httpStatus === 403) {
      console.log("UPSTOX_STATUS=unauthorized");
      console.log(`UPSTOX_HTTP_STATUS=${httpStatus}`);
      console.log("SAFE_MESSAGE=Upstox access token is unauthorized.");
      process.exit(3);
    } else {
      console.log("UPSTOX_STATUS=provider_error");
      console.log(`UPSTOX_HTTP_STATUS=${httpStatus}`);
      console.log("SAFE_MESSAGE=Upstox API returned an unexpected response.");
      process.exit(4);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      console.log("UPSTOX_STATUS=network_error  (timeout)");
      console.log("UPSTOX_HTTP_STATUS=N/A");
      console.log("SAFE_MESSAGE=Upstox API did not respond within timeout.");
    } else if (msg.includes("fetch") || msg.includes("ENOTFOUND") || msg.includes("ECONNREFUSED")) {
      console.log("UPSTOX_STATUS=network_error");
      console.log("UPSTOX_HTTP_STATUS=N/A");
      console.log("SAFE_MESSAGE=Upstox API is unreachable.");
    } else {
      console.log("UPSTOX_STATUS=provider_error");
      console.log("UPSTOX_HTTP_STATUS=N/A");
      console.log(`SAFE_MESSAGE=Provider error: ${msg.substring(0, 100)}`);
    }
    process.exit(5);
  } finally {
    clearTimeout(timer);
  }
}

main();
