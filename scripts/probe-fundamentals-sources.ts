export {};
/**
 * probe-fundamentals-sources.ts
 *
 * Safe diagnostic probe for permitted fundamentals sources.
 * Does NOT bypass login, CAPTCHA, paywalls, or access controls.
 * Does NOT print credentials, cookies, or session tokens.
 *
 * Usage:
 *   npx tsx scripts/probe-fundamentals-sources.ts --symbol=RELIANCE
 *   npx tsx scripts/probe-fundamentals-sources.ts --symbol=TCS --save-sample
 *
 * Environment:
 *   SMOKE_TIMEOUT_MS  — per-request timeout in ms (default: 15000)
 */

const TIMEOUT_MS = parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);

interface ProbeResult {
  source: string;
  status: "reachable" | "auth_required" | "blocked" | "unsupported" | "parse_success" | "parse_failed" | "timeout" | "error";
  httpStatus: number | null;
  contentType?: string;
  hasFinancialData?: boolean;
  fieldCount?: number;
  error?: string;
}

function getSymbol(): string {
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith("--symbol=")) return arg.split("=")[1].trim().toUpperCase();
  }
  return "RELIANCE";
}

function shouldSaveSample(): boolean {
  return process.argv.slice(2).some((a) => a === "--save-sample");
}

async function probeUrl(label: string, url: string, expectedContentHint?: string): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StockStoryIndia/1.0; research)" },
      redirect: "follow",
    });
    const httpStatus = resp.status;
    const contentType = resp.headers.get("content-type") || undefined;

    if (httpStatus === 200) {
      const text = await resp.text();
      const hasFinancialData = text.includes("PE") || text.includes("EPS") || text.includes("ROE") ||
        text.includes("revenue") || text.includes("profit") || text.includes("fundamental");
      const fieldCount = hasFinancialData ? (text.match(/(PE|EPS|ROE|revenue|profit|margin|debt|equity|cash)/gi)?.length ?? 0) : 0;

      return {
        source: label,
        status: "parse_success",
        httpStatus,
        contentType,
        hasFinancialData,
        fieldCount,
      };
    }

    if (httpStatus === 401 || httpStatus === 403) {
      return { source: label, status: "auth_required", httpStatus, contentType };
    }
    if (httpStatus === 429) {
      return { source: label, status: "blocked", httpStatus, error: "rate_limited" };
    }
    if (httpStatus >= 400) {
      return { source: label, status: "blocked", httpStatus, error: `HTTP ${httpStatus}` };
    }

    return { source: label, status: "unsupported", httpStatus, contentType };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { source: label, status: "timeout", httpStatus: null, error: "request timed out" };
    }
    return { source: label, status: "error", httpStatus: null, error: msg.substring(0, 100) };
  } finally {
    clearTimeout(timer);
  }
}

async function main(): Promise<void> {
  const symbol = getSymbol();
  const saveSample = shouldSaveSample();
  console.log(`\n=== Fundamentals Source Probe: ${symbol} ===\n`);

  const probes: { label: string; url: string }[] = [
    { label: "Screener.in (company page)", url: `https://www.screener.in/company/${symbol}/` },
    { label: "Screener.in (consolidated)", url: `https://www.screener.in/company/${symbol}/consolidated/` },
    { label: "Screener.in (quarterly)", url: `https://www.screener.in/company/${symbol}/#quarterly` },
    { label: "Moneycontrol (financials)", url: `https://www.moneycontrol.com/financials/${symbol}/overview` },
    { label: "Moneycontrol (ratios)", url: `https://www.moneycontrol.com/stocks/company_info/print_main.php?sc_disp=1&sc_id=${symbol}` },
    { label: "BSE (listed companies)", url: `https://www.bseindia.com/stock-share-name/${symbol}/stock_download.html` },
    { label: "NSE (company info)", url: `https://www.nseindia.com/api/quote-equity?symbol=${symbol}` },
  ];

  const results: ProbeResult[] = [];
  for (const probe of probes) {
    process.stdout.write(`  Probing ${probe.label}...`);
    const result = await probeUrl(probe.label, probe.url);
    results.push(result);

    const statusEmoji =
      result.status === "parse_success" ? "✓" :
      result.status === "auth_required" ? "🔒" :
      result.status === "blocked" ? "🚫" :
      result.status === "timeout" ? "⏱" : "✗";
    const info = result.hasFinancialData ? ` (${result.fieldCount} fields)` : "";
    const err = result.error ? ` — ${result.error}` : "";
    console.log(` ${statusEmoji} ${result.status}${info}${err}`);
  }

  // Summary
  const usable = results.filter((r) => r.status === "parse_success" && r.hasFinancialData);
  const reachable = results.filter((r) => r.status === "parse_success");
  const blocked = results.filter((r) => r.status === "auth_required" || r.status === "blocked");
  const errored = results.filter((r) => r.status === "timeout" || r.status === "error" || r.status === "unsupported");

  console.log(`\n  --- Summary ---`);
  console.log(`  Usable (financial data detected): ${usable.length}`);
  console.log(`  Reachable (no data detected):     ${reachable.length - usable.length}`);
  console.log(`  Blocked/auth required:            ${blocked.length}`);
  console.log(`  Error/timeout:                    ${errored.length}`);

  if (usable.length > 0) {
    console.log(`\n  Usable sources:`);
    for (const r of usable) console.log(`    ✓ ${r.source}`);
  }
  if (blocked.length > 0) {
    console.log(`\n  Blocked sources:`);
    for (const r of blocked) console.log(`    🚫 ${r.source}`);
  }

  console.log(`\n  Recommendation:`);
  if (usable.length > 0) {
    console.log(`  Direct page parsing is viable for some sources.`);
    console.log(`  However, HTML parsing is brittle. Prefer user-provided CSV exports.`);
  } else {
    console.log(`  No source returned parseable financial data.`);
    console.log(`  Fallback: user-provided CSV export import pipeline.`);
  }
  console.log();

  process.exit(usable.length > 0 ? 0 : 1);
}

main();
