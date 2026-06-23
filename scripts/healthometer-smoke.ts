import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env", quiet: true });

const BASE_URL = process.env.API_BASE_URL || "https://prediction-engine-production-f7a8.up.railway.app";
const SYMBOLS = (process.env.SMOKE_SYMBOLS || "RELIANCE,ITC,TCS,INFY,HDFCBANK").split(",").map((s) => s.trim().toUpperCase());

interface CheckResult {
  symbol: string;
  score: number | null;
  dimCount: number;
  validDims: number;
  issues: string[];
}

async function checkSymbol(symbol: string): Promise<CheckResult> {
  const issues: string[] = [];
  let score: number | null = null;
  let dimCount = 0;
  let validDims = 0;

  try {
    const res = await fetch(`${BASE_URL}/api/stockstory/${symbol}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      issues.push(`HTTP ${res.status}`);
      return { symbol, score: null, dimCount: 0, validDims: 0, issues };
    }
    const body = await res.json() as Record<string, unknown>;
    const data = body["data"] as Record<string, unknown> | undefined;
    if (!data) {
      issues.push("No data in response");
      return { symbol, score: null, dimCount: 0, validDims: 0, issues };
    }

    const h = data["healthometer"] as Record<string, unknown> | undefined;
    if (!h) {
      issues.push("No healthometer in response");
      return { symbol, score: null, dimCount: 0, validDims: 0, issues };
    }

    score = typeof h["overallScore"] === "number" ? h["overallScore"] as number : null;
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      issues.push(`Invalid overallScore: ${score}`);
    }

    const dims = h["dimensions"] as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(dims)) {
      issues.push("No dimensions array");
      return { symbol, score, dimCount: 0, validDims: 0, issues };
    }

    dimCount = dims.length;
    const validIds = ["quality", "financial_strength", "valuation", "growth", "momentum", "stability", "risk"];

    for (const dim of dims) {
      const id = String(dim["id"] ?? "");
      const dimScore = dim["score"];
      if (!validIds.includes(id)) {
        issues.push(`Unknown dimension id: ${id}`);
      }
      if (dimScore !== null) {
        if (typeof dimScore !== "number" || !Number.isFinite(dimScore as number) || (dimScore as number) < 0 || (dimScore as number) > 100) {
          issues.push(`Invalid score for ${id}: ${dimScore}`);
        } else {
          validDims++;
        }
      }
    }
  } catch (err) {
    issues.push(`Fetch error: ${err instanceof Error ? err.message : "unknown"}`);
  }

  return { symbol, score, dimCount, validDims, issues };
}

async function main() {
  console.log("=== Healthometer Smoke ===");
  console.log(`Symbols: ${SYMBOLS.join(", ")}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log("");

  let allOk = true;
  for (const symbol of SYMBOLS) {
    const result = await checkSymbol(symbol);
    const status = result.issues.length === 0 ? "PASS" : "FAIL";
    if (status === "FAIL") allOk = false;
    console.log(`  ${symbol}: ${status}`);
    console.log(`    Score: ${result.score} | Dimensions: ${result.dimCount} (${result.validDims} valid)`);
    if (result.issues.length > 0) {
      for (const issue of result.issues) {
        console.log(`    Issue: ${issue}`);
      }
    }
  }

  console.log("");
  console.log(allOk ? "All checks passed." : "Some checks failed.");
  if (!allOk) process.exitCode = 1;
}

main().catch((err) => {
  console.error("Smoke failed:", err.message);
  process.exitCode = 1;
});
