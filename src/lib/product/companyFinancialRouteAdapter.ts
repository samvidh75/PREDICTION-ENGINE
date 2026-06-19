import type { FinancialMetricGroup, ValuationContext, RiskContext } from "./financialDataModel";

export interface CompanyRouteFinancialData {
  groups: FinancialMetricGroup[];
  valuation: ValuationContext | null;
  risk: RiskContext | null;
  peerCount: number;
  hasHistory: boolean;
  sections: {
    fundamentals: boolean;
    valuation: boolean;
    risk: boolean;
    peers: boolean;
    history: boolean;
  };
}

export function buildCompanyRouteData(
  fundamentals: Record<string, number | null> | null,
  factorScores: Record<string, number | null> | null,
  peerCount: number,
): CompanyRouteFinancialData {
  const groups: FinancialMetricGroup[] = [];
  const sections = { fundamentals: false, valuation: false, risk: false, peers: false, history: false };

  if (fundamentals) {
    const profitabilityMetrics = [
      { label: "Gross margin", value: fundamentals.grossMargin ?? null, format: "percent" as const },
      { label: "Operating margin", value: fundamentals.operatingMargin ?? null, format: "percent" as const },
      { label: "Net margin", value: fundamentals.netMargin ?? null, format: "percent" as const },
      { label: "ROE", value: fundamentals.roe ?? null, format: "percent" as const },
      { label: "ROIC", value: fundamentals.roic ?? null, format: "percent" as const },
    ].filter((m) => m.value !== null && Number.isFinite(m.value));

    if (profitabilityMetrics.length > 0) {
      groups.push({ title: "Profitability & efficiency", metrics: profitabilityMetrics });
      sections.fundamentals = true;
    }

    const valuationMetrics = [
      { label: "P/E", value: fundamentals.peRatio ?? null, format: "ratio" as const },
      { label: "P/B", value: fundamentals.pbRatio ?? null, format: "ratio" as const },
      { label: "EV/EBITDA", value: fundamentals.evEbitda ?? null, format: "ratio" as const },
      { label: "Div yield", value: fundamentals.dividendYield ?? null, format: "percent" as const },
    ].filter((m) => m.value !== null && Number.isFinite(m.value));

    if (valuationMetrics.length > 0) {
      groups.push({ title: "Valuation", metrics: valuationMetrics });
      sections.valuation = true;
    }

    const growthMetrics = [
      { label: "Revenue growth", value: fundamentals.revenueGrowth ?? null, format: "percent" as const },
      { label: "Profit growth", value: fundamentals.profitGrowth ?? null, format: "percent" as const },
      { label: "EPS growth", value: fundamentals.epsGrowth ?? null, format: "percent" as const },
    ].filter((m) => m.value !== null && Number.isFinite(m.value));

    if (growthMetrics.length > 0) {
      groups.push({ title: "Growth", metrics: growthMetrics });
    }

    const healthMetrics = [
      { label: "Debt/Equity", value: fundamentals.debtToEquity ?? null, format: "ratio" as const },
      { label: "Current ratio", value: fundamentals.currentRatio ?? null, format: "ratio" as const },
    ].filter((m) => m.value !== null && Number.isFinite(m.value));

    if (healthMetrics.length > 0) {
      groups.push({ title: "Financial health", metrics: healthMetrics });
    }
  }

  const risk = buildRiskContext(factorScores);

  if (risk) sections.risk = true;
  if (peerCount > 0) sections.peers = true;

  return {
    groups,
    valuation: buildValuationContext(groups),
    risk,
    peerCount,
    hasHistory: false,
    sections,
  };
}

function buildValuationContext(groups: FinancialMetricGroup[]): ValuationContext | null {
  const valGroup = groups.find((g) => g.title === "Valuation");
  if (!valGroup || valGroup.metrics.length === 0) return null;

  const pe = valGroup.metrics.find((m) => m.label === "P/E") ?? null;
  const pb = valGroup.metrics.find((m) => m.label === "P/B") ?? null;
  const ev = valGroup.metrics.find((m) => m.label === "EV/EBITDA") ?? null;
  const dy = valGroup.metrics.find((m) => m.label === "Div yield") ?? null;

  const peVal = pe?.value ?? null;
  const pbVal = pb?.value ?? null;

  let interpretation: string | null = null;
  if (peVal !== null || pbVal !== null) {
    const hints: string[] = [];
    if (peVal !== null) {
      if (peVal > 40) hints.push("P/E appears elevated");
      else if (peVal > 25) hints.push("P/E is moderately above typical");
      else if (peVal > 10) hints.push("P/E is within typical range");
      else if (peVal > 0) hints.push("P/E is below typical range");
    }
    if (pbVal !== null) {
      if (pbVal > 5) hints.push("Premium market assessment");
      else if (pbVal > 2) hints.push("P/B is moderately above book value");
    }
    interpretation = hints.length > 0 ? hints.join("; ") : "Limited valuation context";
  }

  return { peRatio: pe, pbRatio: pb, evEbitda: ev, dividendYield: dy, interpretation };
}

function buildRiskContext(factorScores: Record<string, number | null> | null): RiskContext | null {
  if (!factorScores) return null;
  const riskScore = factorScores.risk ?? null;
  const debtScore = factorScores.debtToEquity ?? null;
  const currentRatio = factorScores.currentRatio ?? null;

  const flags: string[] = [];
  if (riskScore !== null && riskScore < 40) flags.push("Risk profile elevated");
  if (debtScore !== null && debtScore > 1.5) flags.push("Debt level elevated");
  if (currentRatio !== null && currentRatio < 0.8) flags.push("Liquidity may need review");

  if (flags.length === 0 && riskScore === null && debtScore === null && currentRatio === null) return null;

  return {
    debtToEquity: debtScore !== null ? { label: "Debt/Equity", value: debtScore, format: "ratio" } : null,
    currentRatio: currentRatio !== null ? { label: "Current ratio", value: currentRatio, format: "ratio" } : null,
    volatilityRisk: riskScore !== null && riskScore < 40 ? "Risk context is elevated" : riskScore !== null ? "Risk context appears stable" : null,
    keyRiskFlags: flags,
    overallRisk: riskScore !== null ? (riskScore < 40 ? "Elevated" : riskScore < 60 ? "Moderate" : "Low") : null,
  };
}
