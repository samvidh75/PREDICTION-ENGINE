import { FACTOR_REGISTRY, getActiveFactorCount, getCategoryCounts } from "../factors/FactorRegistry";

const total = FACTOR_REGISTRY.length;
const active = getActiveFactorCount();
const cats = getCategoryCounts();

const categorySummary = Object.entries(cats).map(([k, v]) => `${k}: ${v.active}/${v.total} active`);
const allActive = FACTOR_REGISTRY.filter((f) => f.status === "active");
const allIds = FACTOR_REGISTRY.map((f) => f.id);
const uniqueIds = new Set(allIds);
const hasDuplicates = allIds.length !== uniqueIds.size;

const activeDisplayable = allActive.filter((f) => f.displayable).length;
const activeHidden = allActive.length - activeDisplayable;
const coverageRatio = +(active / total).toFixed(3);

console.info(JSON.stringify({
  status: "ok",
  modelVersion: "prediction-engine-v2.0.0",
  factorsDefined: total,
  activeFactors: active,
  inactiveFactors: total - active,
  displayableFactors: activeDisplayable,
  hiddenActiveFactors: activeHidden,
  factorCoverageRatio: coverageRatio,
  hasDuplicateIds: hasDuplicates,
  categoryBreakdown: categorySummary,
  validationTimestamp: new Date().toISOString(),
  message: `Registry validated: ${total} factors, ${active} active, ${activeDisplayable} displayable. Coverage: ${(coverageRatio * 100).toFixed(1)}%.`,
}, null, 2));
