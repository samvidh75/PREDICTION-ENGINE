export {};
/**
 * check-dhan-token.ts
 *
 * Safe Dhan access token diagnostic.
 * Does NOT print token value. Does NOT save raw response payload.
 * Exits 0 if valid, non-zero if expired/missing/network error.
 *
 * Usage:
 *   npx tsx scripts/check-dhan-token.ts
 *
 * Environment:
 *   DHAN_CLIENT_ID     — Dhan client ID
 *   DHAN_ACCESS_TOKEN  — Dhan access token
 *   CHECK_TIMEOUT_MS   — per-request timeout in ms (default: 10000)
 */

const TIMEOUT = parseInt(process.env.CHECK_TIMEOUT_MS || "10000", 10);
const DHAN_API = "https://api.dhan.co/v2";

type TokenStatus = "present" | "missing" | "valid" | "expired" | "unauthorized" | "network_error" | "provider_error" | "rate_limited" | "unknown";

let exitCode = 0;

function tokenStatusLabel(status: TokenStatus, extra?: string): string {
  const labels: Record<TokenStatus, string> = {
    present: "present",
    missing: "missing",
    valid: "valid",
    expired: "expired",
    unauthorized: "unauthorized",
    network_error: "network_error",
    provider_error: "provider_error",
    rate_limited: "rate_limited",
    unknown: "unknown",
  };
  const label = labels[status] ?? "unknown";
  return extra ? `${label} (${extra})` : label;
}

async function main(): Promise<void> {
  const clientId = process.env.DHAN_CLIENT_ID;
  const token = process.env.DHAN_ACCESS_TOKEN;

  if (!clientId && !token) {
    console.log(`DHAN=not_configured`);
    process.exitCode = 0;
    return;
  }

  if (!clientId) {
    console.log(`DHAN=${tokenStatusLabel("missing", "DHAN_CLIENT_ID not set")}`);
    process.exitCode = 0;
    return;
  }

  if (!token) {
    console.log(`DHAN=${tokenStatusLabel("missing", "DHAN_ACCESS_TOKEN not set")}`);
    process.exitCode = 0;
    return;
  }

  console.log(`DHAN=${tokenStatusLabel("present")}`);

  // Health check using a known test symbol
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT);

    const resp = await fetch(`${DHAN_API}/marketfeed/ltp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "access-token": token,
        "client-id": clientId,
      },
      body: JSON.stringify({ NSE_EQ: [11536] }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (resp.ok) {
      const json = await resp.json() as any;
      if (json.status === "success" && json.data?.NSE_EQ?.["11536"]?.last_price) {
        console.log(`DHAN=${tokenStatusLabel("valid")}`);
      } else {
        console.log(`DHAN=${tokenStatusLabel("provider_error", "unexpected response shape")}`);
        exitCode = 1;
      }
    } else if (resp.status === 401 || resp.status === 403) {
      console.log(`DHAN=${tokenStatusLabel("expired")}`);
      exitCode = 0;
    } else if (resp.status === 429) {
      console.log(`DHAN=${tokenStatusLabel("rate_limited")}`);
      exitCode = 0;
    } else {
      console.log(`DHAN=${tokenStatusLabel("provider_error", `HTTP ${resp.status}`)}`);
      exitCode = 1;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("aborted") || msg.includes("timeout")) {
      console.log(`DHAN=${tokenStatusLabel("network_error", "timeout")}`);
    } else {
      console.log(`DHAN=${tokenStatusLabel("network_error")}`);
    }
    exitCode = 0;
  }
}

main().catch((err) => {
  console.log(`DHAN=${tokenStatusLabel("unknown", String(err))}`);
  process.exitCode = 1;
});
