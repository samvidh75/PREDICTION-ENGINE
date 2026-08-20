/**
 * Audit every PSE stock detail page against a live deployment.
 *
 * The /stock/:symbol pages are served by stockHandler in src/render/apiRouter.ts,
 * which composes live quotes, PSE Edge fundamentals, disclosures and a DCF. That
 * pipeline has never been checked across the whole universe, so this script asks
 * the deployed API for every canonical symbol and reports what is missing.
 *
 * It reports; it does not fix. Each flagged symbol needs its own triage (a
 * provider gap, a delisting, a symbol-mapping bug), and guessing a repair is how
 * placeholder data gets into the product in the first place.
 *
 * Usefully, the payload self-declares provenance in `dataSources` (each section
 * marked real / synthetic / unavailable), so the audit can distinguish "page
 * renders" from "page renders real numbers".
 *
 *   npx tsx scripts/audit-live-stock-pages.ts --limit=10
 *   npx tsx scripts/audit-live-stock-pages.ts --symbols=BDO,SM,JFC
 *   npx tsx scripts/audit-live-stock-pages.ts
 *   npx tsx scripts/audit-live-stock-pages.ts --base-url=http://localhost:10000
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getCanonicalSymbols } from "./lib/canonical-symbols";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DEFAULT_BASE_URL = "https://stockstory-india.com";
const USER_AGENT =
  "StockEXPageAudit/1.0 (+https://stockstory-india.com; internal data-quality audit)";
// The API rate-limits at 60 req/min. 2 in flight per 2.5s ≈ 48 req/min, which
// stays under it — an earlier 4-per-1200ms setting ran at ~200 req/min and the
// limiter rejected a fifth of the run, which reads as "the page is broken"
// rather than "the audit was too fast". Override with --concurrency/--delay.
const DEFAULT_CONCURRENCY = 2;
const DEFAULT_BATCH_DELAY_MS = 2500;
const TIMEOUT_MS = 30_000;

type Severity = "error" | "warn";

interface Issue {
  severity: Severity;
  code: string;
  detail: string;
}

interface SymbolAudit {
  symbol: string;
  ok: boolean;
  httpStatus: number | null;
  latencyMs: number;
  issues: Issue[];
  checkedAt: string;
}

/** Inspect one payload for missing/placeholder data. */
function inspectPayload(symbol: string, body: unknown): Issue[] {
  const issues: Issue[] = [];
  const payload = body as Record<string, any> | null;

  if (!payload || typeof payload !== "object") {
    return [{ severity: "error", code: "unparseable", detail: "response was not a JSON object" }];
  }

  const price = payload.price?.current;
  if (typeof price !== "number" || price <= 0) {
    issues.push({ severity: "error", code: "no_price", detail: `price.current = ${JSON.stringify(price)}` });
  }

  const marketCap = payload.price?.marketCap;
  if (typeof marketCap !== "number" || marketCap <= 0) {
    issues.push({ severity: "warn", code: "no_market_cap", detail: `price.marketCap = ${JSON.stringify(marketCap)}` });
  }

  if (!payload.sector || payload.sector === "Diversified") {
    // "Diversified" is stockHandler's fallback when no real sector resolves.
    issues.push({ severity: "warn", code: "no_sector", detail: `sector = ${JSON.stringify(payload.sector)}` });
  }

  if (!payload.companyName || payload.companyName === symbol) {
    // stockHandler falls back to the ticker when metadata lookup returns nothing.
    issues.push({ severity: "warn", code: "no_company_name", detail: `companyName = ${JSON.stringify(payload.companyName)}` });
  }

  // The payload self-declares provenance per section.
  const sources = payload.dataSources as Record<string, string> | undefined;
  if (sources) {
    for (const [section, provenance] of Object.entries(sources)) {
      if (provenance === "synthetic") {
        issues.push({ severity: "warn", code: "synthetic_section", detail: `${section} is synthetic` });
      } else if (provenance === "unavailable") {
        issues.push({ severity: "warn", code: "unavailable_section", detail: `${section} is unavailable` });
      }
    }
  } else {
    issues.push({ severity: "warn", code: "no_data_sources", detail: "payload omitted dataSources provenance map" });
  }

  return issues;
}

async function auditSymbol(baseUrl: string, symbol: string): Promise<SymbolAudit> {
  const startedAt = Date.now();
  const checkedAt = new Date().toISOString();

  try {
    const response = await fetch(`${baseUrl}/api/stock/${encodeURIComponent(symbol)}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      // A rate-limit rejection says nothing about the page's data; flag it
      // separately so it is never mistaken for a broken symbol.
      const rateLimited =
        response.status === 429 ||
        (response.status === 500 && (await response.clone().text()).includes("rate limit"));

      const detail = rateLimited
        ? `HTTP ${response.status} — audit was rate-limited, not a data problem; re-run slower`
        : response.status === 503
          ? "503 — stockHandler reported market data providers not responding"
          : `HTTP ${response.status}`;

      if (rateLimited) {
        return {
          symbol, ok: false, httpStatus: response.status, latencyMs, checkedAt,
          issues: [{ severity: "warn", code: "rate_limited", detail }],
        };
      }
      return {
        symbol, ok: false, httpStatus: response.status, latencyMs, checkedAt,
        issues: [{ severity: "error", code: `http_${response.status}`, detail }],
      };
    }

    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      return {
        symbol, ok: false, httpStatus: response.status, latencyMs, checkedAt,
        issues: [{ severity: "error", code: "invalid_json", detail: "response body was not valid JSON" }],
      };
    }

    const issues = inspectPayload(symbol, body);
    return {
      symbol,
      ok: !issues.some((i) => i.severity === "error"),
      httpStatus: response.status,
      latencyMs,
      issues,
      checkedAt,
    };
  } catch (err) {
    return {
      symbol, ok: false, httpStatus: null, latencyMs: Date.now() - startedAt, checkedAt,
      issues: [{
        severity: "error",
        code: "request_failed",
        detail: err instanceof Error ? err.message : String(err),
      }],
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const arg = (name: string): string | null => {
    const hit = args.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };

  const baseUrl = (arg("base-url") ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
  const only = arg("symbols");
  const limit = arg("limit");
  const concurrency = Number(arg("concurrency") ?? DEFAULT_CONCURRENCY);
  const batchDelayMs = Number(arg("delay") ?? DEFAULT_BATCH_DELAY_MS);

  let symbols = only
    ? only.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
    : getCanonicalSymbols();
  if (limit) symbols = symbols.slice(0, Number(limit));

  if (symbols.length === 0) {
    throw new Error("No symbols to audit — is data/pse-sectors.json present?");
  }

  const reqPerMin = Math.round((concurrency / batchDelayMs) * 60_000);
  console.log(`[audit] ${symbols.length} symbol(s) against ${baseUrl} (~${reqPerMin} req/min)`);

  const results: SymbolAudit[] = [];
  for (let i = 0; i < symbols.length; i += concurrency) {
    const batch = symbols.slice(i, i + concurrency);
    results.push(...await Promise.all(batch.map((s) => auditSymbol(baseUrl, s))));

    const done = Math.min(i + concurrency, symbols.length);
    if (done % 20 === 0 || done === symbols.length) {
      console.log(`[audit] ${done}/${symbols.length} checked`);
    }
    if (done < symbols.length) {
      await new Promise((resolve) => setTimeout(resolve, batchDelayMs));
    }
  }

  const passed = results.filter((r) => r.ok && r.issues.length === 0);
  const withWarnings = results.filter((r) => r.ok && r.issues.length > 0);
  const failed = results.filter((r) => !r.ok);

  console.log("\n── Summary ──────────────────────────────────");
  console.log(`  clean        ${passed.length}`);
  console.log(`  warnings     ${withWarnings.length}`);
  console.log(`  failed       ${failed.length}`);
  console.log(`  total        ${results.length}`);

  const byCode = new Map<string, number>();
  for (const result of results) {
    for (const issue of result.issues) {
      byCode.set(issue.code, (byCode.get(issue.code) ?? 0) + 1);
    }
  }
  if (byCode.size > 0) {
    console.log("\n── Issues by code ───────────────────────────");
    for (const [code, count] of [...byCode].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${String(count).padStart(4)}  ${code}`);
    }
  }

  if (failed.length > 0) {
    console.log("\n── Failed symbols ───────────────────────────");
    for (const result of failed) {
      console.log(`  ${result.symbol.padEnd(8)} ${result.issues.map((i) => i.detail).join("; ")}`);
    }
  }

  const latencies = results.map((r) => r.latencyMs).sort((a, b) => a - b);
  if (latencies.length > 0) {
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    console.log(`\n  latency p50 ${p50}ms · p95 ${p95}ms · max ${latencies[latencies.length - 1]}ms`);
  }

  const date = new Date().toISOString().slice(0, 10);
  const outPath = path.join(root, "data", "audit-reports", `live-stock-audit-${date}.json`);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    baseUrl,
    totals: {
      total: results.length,
      clean: passed.length,
      warnings: withWarnings.length,
      failed: failed.length,
    },
    results,
  }, null, 2)}\n`);

  console.log(`\n[audit] report written to ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
