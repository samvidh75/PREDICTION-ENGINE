const provider = process.argv.find((arg) => arg.startsWith("--provider="))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");
const symbols = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1]?.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean) ?? [];
const universe = process.argv.find((arg) => arg.startsWith("--universe="))?.split("=")[1];

if (!provider) throw new Error("Missing --provider. Available safe provider in this branch: existing-database.");
if (provider !== "existing-database") {
  throw new Error(`Provider ${provider} is not enabled. No unlicensed Screener, Moneycontrol, Google Finance, NSE, BSE, or Yahoo scraping is implemented.`);
}

console.log(JSON.stringify({
  mode: dryRun ? "dry-run" : "apply",
  provider,
  symbols,
  universe,
  status: "no-op",
  message: "Fundamental ingestion adapter contract is present. existing-database reads current snapshots only; no external automated source is enabled without documented authorization.",
}, null, 2));

