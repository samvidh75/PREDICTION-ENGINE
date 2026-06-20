export type ChecklistItemStatus =
  | "pass"
  | "neutral"
  | "watch"
  | "fail"
  | "not_enough_information";

export type ChecklistCategory =
  | "Financial quality"
  | "Profitability"
  | "Growth"
  | "Balance sheet"
  | "Valuation context"
  | "Ownership"
  | "Peer comparison"
  | "Momentum"
  | "Risk"
  | "Data confidence";

export interface ChecklistItem {
  id: string;
  label: string;
  category: ChecklistCategory;
  status: ChecklistItemStatus;
  evidence: string;
  severity: "low" | "medium" | "high";
}

export interface ChecklistCategorySummary {
  category: ChecklistCategory;
  label: string;
  passCount: number;
  totalCount: number;
  strongest: boolean;
  weakest: boolean;
}

export interface ResearchChecklistView {
  items: ChecklistItem[];
  categories: ChecklistCategorySummary[];
  totalItems: number;
  passCount: number;
  watchpointCount: number;
  notEnoughInfoCount: number;
  strongestCategory: string;
  weakestCategory: string;
  explanation: string;
}

export interface ChecklistInput {
  healthometerScores: { id: string; label: string; score: number | null }[];
  momentumScore: number | null;
  riskScore: number | null;
  peContext: string | null;
  pbContext: string | null;
  debtWarning: string | null;
  volatilityNote: string | null;
  promoterHolding: number | null;
  fiiHolding: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  roce: number | null;
  roe: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  hasPeerData: boolean;
}

function scoreToStatus(score: number | null): ChecklistItemStatus {
  if (score === null) return "not_enough_information";
  if (score >= 70) return "pass";
  if (score >= 50) return "neutral";
  if (score >= 35) return "watch";
  return "fail";
}

export function buildResearchChecklist(input: ChecklistInput): ResearchChecklistView {
  const items: ChecklistItem[] = [];

  const qualityScore = input.healthometerScores.find((d) => d.id === "quality")?.score ?? null;
  items.push({
    id: "business-quality",
    label: "Business quality assessment",
    category: "Financial quality",
    status: scoreToStatus(qualityScore),
    evidence: qualityScore !== null
      ? `Quality dimension at ${qualityScore}/100`
      : "Business quality data not yet available",
    severity: "high",
  });

  const financialStrengthScore = input.healthometerScores.find((d) => d.id === "financial_strength")?.score ?? null;
  items.push({
    id: "financial-strength",
    label: "Financial strength",
    category: "Financial quality",
    status: scoreToStatus(financialStrengthScore),
    evidence: financialStrengthScore !== null
      ? `Financial strength at ${financialStrengthScore}/100`
      : "Financial strength data not yet available",
    severity: "high",
  });

  items.push({
    id: "profitability-roe",
    label: "Return on equity",
    category: "Profitability",
    status: input.roe !== null ? (input.roe >= 12 ? "pass" : input.roe >= 8 ? "neutral" : "watch") : "not_enough_information",
    evidence: input.roe !== null ? `ROE at ${input.roe.toFixed(1)}%` : "ROE data not yet available",
    severity: "medium",
  });

  items.push({
    id: "profitability-roce",
    label: "Return on capital employed",
    category: "Profitability",
    status: input.roce !== null ? (input.roce >= 15 ? "pass" : input.roce >= 10 ? "neutral" : "watch") : "not_enough_information",
    evidence: input.roce !== null ? `ROCE at ${input.roce.toFixed(1)}%` : "ROCE data not yet available",
    severity: "medium",
  });

  items.push({
    id: "revenue-growth",
    label: "Revenue growth trajectory",
    category: "Growth",
    status: input.revenueGrowth !== null
      ? (input.revenueGrowth >= 10 ? "pass" : input.revenueGrowth >= 5 ? "neutral" : "watch")
      : "not_enough_information",
    evidence: input.revenueGrowth !== null
      ? `${input.revenueGrowth >= 0 ? "+" : ""}${input.revenueGrowth.toFixed(1)}% revenue change`
      : "Revenue growth data not yet available",
    severity: "medium",
  });

  items.push({
    id: "profit-growth",
    label: "Profit growth trajectory",
    category: "Growth",
    status: input.profitGrowth !== null
      ? (input.profitGrowth >= 10 ? "pass" : input.profitGrowth >= 5 ? "neutral" : input.profitGrowth >= 0 ? "watch" : "fail")
      : "not_enough_information",
    evidence: input.profitGrowth !== null
      ? `${input.profitGrowth >= 0 ? "+" : ""}${input.profitGrowth.toFixed(1)}% profit change`
      : "Profit growth data not yet available",
    severity: "high",
  });

  items.push({
    id: "debt-to-equity",
    label: "Debt to equity ratio",
    category: "Balance sheet",
    status: input.debtToEquity !== null
      ? (input.debtToEquity <= 0.5 ? "pass" : input.debtToEquity <= 1.5 ? "neutral" : input.debtToEquity <= 3 ? "watch" : "fail")
      : "not_enough_information",
    evidence: input.debtToEquity !== null
      ? `D/E at ${input.debtToEquity.toFixed(2)}`
      : "Debt data not yet available",
    severity: "high",
  });

  items.push({
    id: "current-ratio",
    label: "Current ratio",
    category: "Balance sheet",
    status: input.currentRatio !== null
      ? (input.currentRatio >= 1.5 ? "pass" : input.currentRatio >= 1 ? "neutral" : "watch")
      : "not_enough_information",
    evidence: input.currentRatio !== null
      ? `Current ratio at ${input.currentRatio.toFixed(2)}`
      : "Liquidity data not yet available",
    severity: "medium",
  });

  const valuationScore = input.healthometerScores.find((d) => d.id === "valuation")?.score ?? null;
  items.push({
    id: "valuation-context",
    label: "Valuation context",
    category: "Valuation context",
    status: scoreToStatus(valuationScore),
    evidence: valuationScore !== null
      ? `Valuation dimension at ${valuationScore}/100`
      : "Valuation context not yet available",
    severity: "high",
  });

  items.push({
    id: "ownership-promoter",
    label: "Promoter holding context",
    category: "Ownership",
    status: input.promoterHolding !== null
      ? (input.promoterHolding >= 50 ? "pass" : input.promoterHolding >= 25 ? "neutral" : "watch")
      : "not_enough_information",
    evidence: input.promoterHolding !== null
      ? `Promoter holding at ${input.promoterHolding.toFixed(1)}%`
      : "Promoter holding data not yet available",
    severity: "medium",
  });

  items.push({
    id: "ownership-fii",
    label: "FII participation",
    category: "Ownership",
    status: input.fiiHolding !== null
      ? (input.fiiHolding >= 10 ? "pass" : input.fiiHolding >= 5 ? "neutral" : "watch")
      : "not_enough_information",
    evidence: input.fiiHolding !== null
      ? `FII holding at ${input.fiiHolding.toFixed(1)}%`
      : "FII holding data not yet available",
    severity: "medium",
  });

  items.push({
    id: "peer-comparison",
    label: "Peer comparison available",
    category: "Peer comparison",
    status: input.hasPeerData ? "neutral" : "not_enough_information",
    evidence: input.hasPeerData
      ? "Peer comparison data is available"
      : "Peer comparison not yet available",
    severity: "low",
  });

  const momentumStatus = input.momentumScore !== null
    ? (input.momentumScore >= 60 ? "pass" : input.momentumScore >= 40 ? "neutral" : "watch")
    : "not_enough_information";
  items.push({
    id: "momentum-signal",
    label: "Momentum signal",
    category: "Momentum",
    status: momentumStatus,
    evidence: input.momentumScore !== null
      ? `Momentum score at ${input.momentumScore}/100`
      : "Momentum data not yet available",
    severity: "medium",
  });

  const riskStatus = input.riskScore !== null
    ? (input.riskScore >= 65 ? "fail" : input.riskScore >= 45 ? "watch" : input.riskScore >= 30 ? "neutral" : "pass")
    : "not_enough_information";
  items.push({
    id: "risk-assessment",
    label: "Risk assessment",
    category: "Risk",
    status: riskStatus,
    evidence: input.riskScore !== null
      ? `Risk score at ${input.riskScore}/100`
      : "Risk data not yet available",
    severity: "high",
  });

  items.push({
    id: "data-confidence",
    label: "Sufficient data for assessment",
    category: "Data confidence",
    status: items.filter((i) => i.status !== "not_enough_information").length >= 6 ? "pass" : "neutral",
    evidence: `${items.filter((i) => i.status !== "not_enough_information").length} of ${items.length} checks have data`,
    severity: "low",
  });

  const categories: ChecklistCategory[] = [
    "Financial quality", "Profitability", "Growth", "Balance sheet",
    "Valuation context", "Ownership", "Peer comparison", "Momentum", "Risk", "Data confidence",
  ];

  const categorySummaries: ChecklistCategorySummary[] = categories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const passCount = catItems.filter((i) => i.status === "pass").length;
    return {
      category: cat,
      label: cat,
      passCount,
      totalCount: catItems.length,
      strongest: false,
      weakest: false,
    };
  });

  const viableCategories = categorySummaries.filter((c) => c.totalCount > 0);
  const highestPassRate = Math.max(...viableCategories.map((c) => c.passCount / c.totalCount), 0);
  const lowestPassRate = Math.min(...viableCategories.map((c) => c.passCount / c.totalCount), Infinity);

  let strongestCategory = categories[0];
  let weakestCategory = categories[0];

  viableCategories.forEach((c) => {
    const rate = c.passCount / c.totalCount;
    if (rate === highestPassRate) {
      c.strongest = true;
      strongestCategory = c.category;
    }
    if (rate === lowestPassRate) {
      c.weakest = true;
      weakestCategory = c.category;
    }
  });

  const passCount = items.filter((i) => i.status === "pass").length;
  const watchpointCount = items.filter((i) => i.status === "watch" || i.status === "fail").length;
  const notEnoughInfoCount = items.filter((i) => i.status === "not_enough_information").length;

  const explanation = buildChecklistExplanation(passCount, items.length, watchpointCount, strongestCategory, weakestCategory);

  return {
    items,
    categories: categorySummaries,
    totalItems: items.length,
    passCount,
    watchpointCount,
    notEnoughInfoCount,
    strongestCategory,
    weakestCategory,
    explanation,
  };
}

function buildChecklistExplanation(
  passCount: number,
  totalItems: number,
  watchpointCount: number,
  strongest: string,
  weakest: string,
): string {
  const parts: string[] = [];
  if (totalItems > 0) {
    parts.push(`${passCount} of ${totalItems} checks pass.`);
  }
  if (watchpointCount > 0) {
    parts.push(`${watchpointCount} watchpoint${watchpointCount > 1 ? "s" : ""} to review.`);
  }
  parts.push(`Strongest area: ${strongest}.`);
  parts.push(`Review ${weakest} for potential concerns.`);
  return parts.join(" ");
}
