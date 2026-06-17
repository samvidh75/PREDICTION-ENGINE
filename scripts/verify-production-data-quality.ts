export {};
/**
 * verify-production-data-quality.ts
 *
 * Production data quality verification via HTTP API endpoints.
 * Checks coverage, leaderboard, signals, and company endpoints.
 * Exits non-zero on critical failures.
 *
 * Usage:
 *   npx tsx scripts/verify-production-data-quality.ts
 *
 * Environment:
 *   SMOKE_TIMEOUT_MS  — per-request timeout in ms (default: 15000)
 */

const __DQ_FRONTEND = "https://www.stockstory-india.com";
const __DQ_TIMEOUT = parseInt(process.env.SMOKE_TIMEOUT_MS || "15000", 10);

type DqResult = { name: string; status: "ok" | "warn" | "fail"; detail?: string; category: string };

async function dqFetch(url: string, timeoutMs: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function dqCheck(
  label: string,
  category: string,
  url: string,
  expectFields?: string[],
  validate?: (body: Record<string, unknown>) => string | null,
): Promise<DqResult> {
  try {
    const response = await dqFetch(url, __DQ_TIMEOUT);
    if (!response.ok) {
      return { name: label, category, status: "fail", detail: `HTTP ${response.status}` };
    }
    const text = await response.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      return { name: label, category, status: "fail", detail: "invalid JSON" };
    }

    if (expectFields) {
      for (const field of expectFields) {
        const parts = field.split(".");
        let val: unknown = body;
        for (const part of parts) {
          if (val && typeof val === "object" && part in (val as Record<string, unknown>)) {
            val = (val as Record<string, unknown>)[part];
          } else {
            return { name: label, category, status: "fail", detail: `missing field "${field}"` };
          }
        }
      }
    }

    if (validate) {
      const validationError = validate(body);
      if (validationError) {
        return { name: label, category, status: "fail", detail: validationError };
      }
    }

    return { name: label, category, status: "ok" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: label, category, status: "fail", detail: msg };
  }
}

function dqNoNaN(obj: Record<string, unknown>, path = ""): string | null {
  for (const [key, value] of Object.entries(obj)) {
    const cp = path ? `${path}.${key}` : key;
    if (value === null || value === undefined) continue;
    if (typeof value === "number" && !Number.isFinite(value)) return `${cp}=${value}`;
    if (typeof value === "object" && !Array.isArray(value)) {
      const nested = dqNoNaN(value as Record<string, unknown>, cp);
      if (nested) return nested;
    }
  }
  return null;
}

async function main(): Promise<void> {
  const results: DqResult[] = [];

  // Coverage endpoint
  results.push(await dqCheck("coverage_health", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`,
    ["ok", "coverage.symbols.count", "coverage.dailyPrices.rowCount"],
    (body) => {
      const cov = body.coverage as Record<string, any> | undefined;
      if (!cov) return "no coverage object";
      if (typeof cov.symbols?.count !== "number") return "symbols count not a number";
      if (cov.symbols.count < 10) return `only ${cov.symbols.count} symbols (expected >= 10)`;
      return null;
    },
  ));

  // Leaderboard endpoint
  results.push(await dqCheck("leaderboard", "data",
    `${__DQ_FRONTEND}/api/intelligence/leaderboard?limit=5`, undefined,
    (body) => {
      const data = (body as any).data;
      if (!Array.isArray(data)) return "leaderboard data is not an array";
      const nan = dqNoNaN(body);
      if (nan) return `NaN/Infinity: ${nan}`;
      if (data.length > 0 && !data[0].symbol) return "entry missing symbol";
      return null;
    },
  ));

  // Signals endpoint
  results.push(await dqCheck("signals", "data",
    `${__DQ_FRONTEND}/api/predictions/signals?limit=10`, undefined,
    (body) => {
      const s = (body as any).data?.signals;
      if (!Array.isArray(s)) return "signals is not an array";
      const nan = dqNoNaN(body);
      if (nan) return `NaN/Infinity: ${nan}`;
      return null;
    },
  ));

  // Company endpoint — validates structure, not data availability (unavailability is a valid state)
  results.push(await dqCheck("company_RELIANCE", "data",
    `${__DQ_FRONTEND}/api/stockstory/RELIANCE`,
    ["status", "dataState"],
    (body) => {
      const nan = dqNoNaN(body);
      if (nan) return `NaN/Infinity: ${nan}`;
      return null;
    },
  ));

  // Health endpoint
  results.push(await dqCheck("health", "ops",
    `${__DQ_FRONTEND}/api/ops/health`,
    ["status", "metrics.db_health"],
    (body) => {
      const m = (body as any).metrics;
      if (m?.db_health !== "connected") return `db_health=${m?.db_health}`;
      const nan = dqNoNaN(body);
      if (nan) return `NaN/Infinity: ${nan}`;
      return null;
    },
  ));

  // Fundamentals coverage
  results.push(await dqCheck("fundamentals", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`,
    ["coverage.financialSnapshots.rowCount"],
    (body) => {
      const cov = body.coverage as Record<string, any> | undefined;
      const fs = cov?.financialSnapshots;
      if (!fs || fs.status !== "available") return `financialSnapshots status=${fs?.status ?? "unavailable"}`;
      if (typeof fs.rowCount === "number" && fs.rowCount === 0) return "financial_snapshots has 0 rows";
      return null;
    },
  ));
  results.push(await dqCheck("prediction_registry", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`,
    ["coverage.predictionRegistry.rowCount"],
    (body) => {
      const cov = body.coverage as Record<string, any> | undefined;
      const pr = cov?.predictionRegistry;
      if (!pr || pr.status !== "available") return `predictionRegistry status=${pr?.status ?? "unavailable"}`;
      if (typeof pr.rowCount === "number" && pr.rowCount === 0) return "predictionRegistry has 0 rows";
      return null;
    },
  ));

  // NaN/Infinity scan
  results.push(await dqCheck("coverage_no_nan", "quality",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => dqNoNaN(body),
  ));

  // Print report
  const categories = ["coverage", "data", "ops", "quality"];
  let allOk = true;
  let warns = 0;

  console.log("\n=== Production Data Quality Report ===\n");

  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    if (catResults.length === 0) continue;
    console.log(`  [${cat.toUpperCase()}]`);
    for (const r of catResults) {
      const icon = r.status === "ok" ? "✓" : r.status === "warn" ? "△" : "✗";
      console.log(`    ${icon} ${r.name}  ${r.detail ? `(${r.detail})` : ""}`);
      if (r.status === "fail") allOk = false;
      if (r.status === "warn") warns++;
    }
    console.log();
  }

  if (warns > 0) console.log(`  ${warns} warning(s) — non-critical\n`);
  console.log(allOk ? "  QUALITY=PASS\n" : "  QUALITY=FAIL\n");
  process.exitCode = allOk ? 0 : 1;
}

main();
