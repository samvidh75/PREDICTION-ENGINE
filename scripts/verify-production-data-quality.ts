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
      if (body.status === "empty") return null;
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

  // Scored symbols count
  results.push(await dqCheck("scored_symbols", "coverage",
    `${__DQ_FRONTEND}/api/intelligence/leaderboard?limit=200`, undefined,
    (body) => {
      const data = (body as any).data;
      if (!Array.isArray(data)) return "leaderboard data is not an array";
      if (data.length === 0) return "leaderboard has 0 entries (all symbols unscored)";
      return null;
    },
  ));

  // Scoring gap report (informational — does not fail)
  {
    const check = await dqCheck("scoring_gap", "coverage",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const cov = body.coverage as Record<string, any> | undefined;
        if (!cov) return "no coverage object";
        const totalSym = cov.symbols?.count;
        const scoredSym = cov.featureSnapshots?.symbolCount;
        if (typeof totalSym !== "number") return "symbols count not a number";
        if (typeof scoredSym !== "number") return "featureSnapshots symbolCount not a number";
        const gap = totalSym - scoredSym;
        if (gap > 0) {
          return `warn (gap=${gap} symbols without features)`;
        }
        return null;
      }
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // ── Provider compliance checks ────────────────────────────────

  // No active Dhan/Upstox in provider code
  results.push(await dqCheck("no_deprecated_providers", "compliance",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => {
      const provs = (body as any).providers as Record<string, any> || {};
      const keys = Object.keys(provs);
      const forbidden = ["DHAN_CLIENT_ID", "UPSTOX_ACCESS_TOKEN", "DHAN", "UPSTOX"];
      const found = forbidden.filter((k) => keys.includes(k));
      if (found.length > 0) return `deprecated providers present: ${found.join(", ")}`;
      return null;
    },
  ));

  // Active quote provider coverage (IndianAPI or public NSE)
  results.push(await dqCheck("quote_provider_coverage", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => {
      const provs = (body as any).providers as Record<string, any> || {};
      const indian = provs.INDIANAPI_KEY;
      const nsepython = provs.NSEPYTHON;
      const indianOk = indian?.status === "healthy";
      const nsepythonOk = nsepython?.status === "healthy" && nsepython?.domains?.quote?.healthy === true;
      if (!indianOk && !nsepythonOk) return "no active quote provider: IndianAPI nor NSEPython healthy";
      return null;
    },
  ));

  // Active historical provider coverage (public NSE or DB)
  results.push(await dqCheck("historical_provider_coverage", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => {
      const cov = body.coverage as Record<string, any> | undefined;
      const provs = (body as any).providers as Record<string, any> || {};
      const nsepython = provs.NSEPYTHON;
      const nsepythonOk = nsepython?.status === "healthy" && nsepython?.domains?.historical?.healthy === true;
      const dbHasData = cov?.dailyPrices?.rowCount > 0;
      if (!nsepythonOk && !dbHasData) return "no active historical provider: NSEPython unhealthy and dailyPrices empty";
      return null;
    },
  ));

  // Bhavcopy/delivery provider coverage (warn-only — requires deployment)
  {
    const check = await dqCheck("bhavcopy_delivery_coverage", "coverage",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const provs = (body as any).providers as Record<string, any> || {};
        const jd = provs.JUGAD_DATA;
        if (!jd) return "warn (deploy to verify)";
        const bhavOk = jd?.domains?.bhavcopy?.healthy === true;
        const delOk = jd?.domains?.delivery?.healthy === true;
        if (!bhavOk && !delOk) return "warn (Jugaad-Data bhavcopy/delivery unavailable)";
        if (!bhavOk) return "warn (Jugaad-Data bhavcopy unavailable)";
        if (!delOk) return "warn (Jugaad-Data delivery unavailable)";
        return null;
      },
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // Index/sector provider coverage (warn-only — requires deployment)
  {
    const check = await dqCheck("index_sector_coverage", "coverage",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const provs = (body as any).providers as Record<string, any> || {};
        const jd = provs.JUGAD_DATA;
        if (!jd) return "warn (deploy to verify)";
        const idxOk = jd?.domains?.index?.healthy === true;
        const secOk = jd?.domains?.sector?.healthy === true;
        if (!idxOk && !secOk) return "warn (Jugaad-Data index/sector unavailable)";
        if (!idxOk) return "warn (Jugaad-Data index unavailable)";
        if (!secOk) return "warn (Jugaad-Data sector unavailable)";
        return null;
      },
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // Fundamentals automatic provider coverage (warn-only — partial status is OK due to DB snapshots)
  {
    const check = await dqCheck("fundamentals_automatic", "coverage",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const provs = (body as any).providers as Record<string, any> || {};
        const cov = body.coverage as Record<string, any> | undefined;
        const fa = provs.FUNDAMENTALS_AUTOMATIC;
        if (!fa) return "warn (deploy to verify)";
        if (fa.status === "unavailable") return `warn (fundamentals automatic status=${fa?.status} — no DB snapshots and no automatic source)`;
        if (fa.status === "partial") {
          const fsRows = cov?.financialSnapshots?.rowCount ?? 0;
          const fsSymbols = cov?.financialSnapshots?.symbolCount ?? 0;
          return `(partial: ${fsRows} snapshots, ${fsSymbols} symbols via DB. CSV/manual fallback available.)`;
        }
        return null;
      },
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // CSV fallback readiness (warn-only — requires deployment)
  {
    const check = await dqCheck("csv_fallback_readiness", "coverage",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const provs = (body as any).providers as Record<string, any> || {};
        const csv = provs.CSV_FALLBACK;
        if (!csv) return "warn (CSV_FALLBACK not yet deployed)";
        if (csv.status !== "local_only" && csv.status !== "healthy") return `warn (csv_fallback status=${csv.status})`;
        return null;
      },
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // Yahoo reachability status (degraded does not fail)
  {
    const check = await dqCheck("yahoo_reachability", "quality",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const provs = (body as any).providers as Record<string, any> || {};
        const yahoo = provs.YAHOO;
        if (!yahoo) return "YAHOO provider missing from status";
        if (yahoo.status === "degraded" || yahoo.status === "unavailable") {
          return `warn (Yahoo ${yahoo.status} — public NSE providers unaffected)`;
        }
        return null;
      }
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // IndianAPI load-sharing status with cache protection
  results.push(await dqCheck("indianapi_load_sharing", "coverage",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => {
      const provs = (body as any).providers as Record<string, any> || {};
      const indian = provs.INDIANAPI_KEY;
      if (!indian) return "INDIANAPI_KEY provider missing";
      if (indian.status !== "healthy") return `IndianAPI status=${indian.status}`;
      return null;
    },
  ));

  // No provider marked healthy with zero rows
  results.push(await dqCheck("no_healthy_zero_rows", "quality",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => {
      const cov = body.coverage as Record<string, any> | undefined;
      if (!cov) return "no coverage object";
      const tables = ["dailyPrices", "financialSnapshots", "featureSnapshots", "factorSnapshots", "predictionRegistry"];
      const issues: string[] = [];
      for (const t of tables) {
        const table = cov[t];
        if (table && table.status === "available" && typeof table.rowCount === "number" && table.rowCount === 0) {
          issues.push(`${t} has 0 rows but status=available`);
        }
      }
      if (issues.length > 0) return issues.join("; ");
      return null;
    },
  ));

  // No orphan feature/factor/prediction rows (informational — does not fail)
  {
    const check = await dqCheck("orphan_rows", "quality",
      `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
      (body) => {
        const cov = body.coverage as Record<string, any> | undefined;
        if (!cov) return "no coverage object";
        const symCount = cov.symbols?.count;
        const featSym = cov.featureSnapshots?.symbolCount;
        const factSym = cov.factorSnapshots?.symbolCount;
        const predSym = cov.predictionRegistry?.symbolCount;
        if (typeof symCount !== "number" || typeof featSym !== "number" || typeof factSym !== "number" || typeof predSym !== "number") {
          return null; // skip if counts unavailable
        }
        const orphans: string[] = [];
        if (featSym > symCount) orphans.push(`featureSnapshots symbols(${featSym}) > symbols(${symCount})`);
        if (factSym > symCount) orphans.push(`factorSnapshots symbols(${factSym}) > symbols(${symCount})`);
        if (predSym > symCount) orphans.push(`predictionRegistry symbols(${predSym}) > symbols(${symCount})`);
        if (orphans.length > 0) return `warn (${orphans.join("; ")})`;
        return null;
      }
    );
    if (check.status === "fail") check.status = "warn";
    results.push(check);
  }

  // NaN/Infinity scan
  results.push(await dqCheck("coverage_no_nan", "quality",
    `${__DQ_FRONTEND}/api/ops/data-coverage`, undefined,
    (body) => dqNoNaN(body),
  ));

  // Print report
  const categories = ["coverage", "data", "ops", "quality", "compliance"];
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
