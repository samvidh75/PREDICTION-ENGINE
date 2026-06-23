import { config as loadDotEnv } from "dotenv";
loadDotEnv({ path: ".env", quiet: true });

const BASE_URL = process.env.API_BASE_URL || "https://prediction-engine-production-f7a8.up.railway.app";

async function checkSymbol(symbol: string): Promise<string[]> {
  const issues: string[] = [];
  try {
    const res = await fetch(`${BASE_URL}/api/technicals/${symbol}/latest`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) { issues.push(`HTTP ${res.status}`); return issues; }
    const data = await res.json() as Record<string, unknown>;
    const indicators = data["indicators"] as Record<string, unknown> | undefined;
    if (!indicators) { issues.push("No indicators in response"); return issues; }
    const rsi = indicators["rsi14"] as number | null;
    if (rsi !== null && (typeof rsi !== "number" || rsi < 0 || rsi > 100)) issues.push(`RSI out of range: ${rsi}`);
    const adx = indicators["adx14"] as number | null;
    if (adx !== null && adx < 0) issues.push(`ADX negative: ${adx}`);
    const atr = indicators["atr14"] as number | null;
    if (atr !== null && atr < 0) issues.push(`ATR negative: ${atr}`);
    const macd = indicators["macd"] as number | null;
    if (macd !== null && !Number.isFinite(macd)) issues.push(`MACD not finite: ${macd}`);
    const sma20 = indicators["sma20"] as number | null;
    if (sma20 !== null && sma20 <= 0) issues.push(`SMA20 not positive: ${sma20}`);
  } catch (err) {
    issues.push(`Fetch error: ${err instanceof Error ? err.message : "unknown"}`);
  }
  return issues;
}

async function main() {
  const symbols = (process.argv.find((a) => a.startsWith("--symbols="))?.split("=")[1] || "RELIANCE,ITC").split(",").map((s) => s.trim().toUpperCase());
  console.log("=== Technical Indicators Smoke ===");
  console.log("");
  let allOk = true;
  for (const symbol of symbols) {
    const issues = await checkSymbol(symbol);
    const status = issues.length === 0 ? "PASS" : "FAIL";
    if (status === "FAIL") allOk = false;
    console.log(`  ${symbol}: ${status}`);
    for (const issue of issues) console.log(`    ${issue}`);
  }
  console.log("");
  console.log(allOk ? "All checks passed." : "Some checks failed.");
  if (!allOk) process.exitCode = 1;
}

main().catch((err) => { console.error(err.message); process.exitCode = 1; });
