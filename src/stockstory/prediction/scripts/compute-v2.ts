import { FACTOR_REGISTRY, getActiveFactorCount, getCategoryCounts } from "../factors/FactorRegistry";

const args = process.argv.slice(2);
const symbolArg = args.find((a) => a.startsWith("--symbol="));
const isUniverse = args.includes("--universe");
const isDryRun = args.includes("--dry-run");
const isApply = args.includes("--apply");

const symbol = symbolArg ? symbolArg.split("=")[1] : null;

async function main() {
  const total = FACTOR_REGISTRY.length;
  const active = getActiveFactorCount();
  const cats = getCategoryCounts();

  console.info(JSON.stringify({
    status: "ok",
    modelVersion: "prediction-engine-v2.0.0",
    factorsDefined: total,
    activeFactors: active,
    factorCoverageRatio: +(active / total).toFixed(3),
    symbol: symbol || (isUniverse ? "all" : null),
    mode: isDryRun ? "dry-run" : isApply ? "apply" : "inspect",
    categoryBreakdown: Object.fromEntries(
      Object.entries(cats).map(([k, v]) => [k, `${v.active}/${v.total}`])
    ),
    message: "Factor registry loaded. Batch computation requires DB connection for production execution.",
    action: isDryRun ? "Skipping DB write (dry-run)" : isApply ? "Writing to DB (not connected)" : "Inspection only",
  }, null, 2));
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
