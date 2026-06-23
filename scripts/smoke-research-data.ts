import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env", quiet: true });

const BASE_URL = process.env.API_BASE_URL || "https://prediction-engine-production-f7a8.up.railway.app";

const ENDPOINTS = [
  { path: "/api/research/company/RELIANCE", label: "Research RELIANCE" },
  { path: "/api/research/company/ITC", label: "Research ITC" },
  { path: "/api/stockstory/RELIANCE", label: "StockStory RELIANCE" },
  { path: "/api/stockstory/ITC", label: "StockStory ITC" },
  { path: "/api/financial-series/RELIANCE", label: "FinancialSeries RELIANCE" },
  { path: "/api/financial-series/ITC", label: "FinancialSeries ITC" },
  { path: "/api/news/RELIANCE", label: "News RELIANCE" },
  { path: "/api/news/ITC", label: "News ITC" },
  { path: "/api/research/scanner?preset=Quality+compounders&limit=5", label: "Scanner" },
] as const;

const FORBIDDEN = /backend|provider|API|coverage|freshness|source pending|diagnostics|lineage|migration|backfill/gi;

async function checkEndpoint(path: string, label: string): Promise<string[]> {
  const issues: string[] = [];
  try {
    const res = await fetch(`${BASE_URL}${path}`, { signal: AbortSignal.timeout(15_000) });
    if (res.status !== 200) {
      issues.push(`HTTP ${res.status} (expected 200)`);
      return issues;
    }
    const text = await res.text();
    if (text.includes("NaN") || text.includes("Infinity") || text.includes("undefined")) {
      issues.push("Contains NaN/Infinity/undefined");
    }
    const body = JSON.parse(text);
    const bodyStr = JSON.stringify(body);
    const forbiddenMatches = bodyStr.match(FORBIDDEN);
    if (forbiddenMatches) {
      issues.push(`Forbidden terms: ${[...new Set(forbiddenMatches)].join(", ")}`);
    }
  } catch (err) {
    issues.push(`Error: ${err instanceof Error ? err.message : "unknown"}`);
  }
  return issues;
}

async function main() {
  console.log("=== Research Data Smoke ===");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("");

  let allOk = true;
  for (const { path, label } of ENDPOINTS) {
    const issues = await checkEndpoint(path, label);
    const status = issues.length === 0 ? "PASS" : "FAIL";
    if (status === "FAIL") allOk = false;
    console.log(`  ${label}: ${status}`);
    for (const issue of issues) {
      console.log(`    ${issue}`);
    }
  }

  console.log("");
  console.log(allOk ? "All endpoints passed." : "Some endpoints failed.");
  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Smoke failed:", err.message);
  process.exitCode = 1;
});
