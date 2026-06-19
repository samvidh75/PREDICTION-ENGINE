export interface CompanyMetric {
  label: string;
  value: number | null;
  unit: "number" | "percent" | "ratio" | "currency" | "multiple";
  interpretation: string | null;
  isPositive: boolean | null;
}

export interface FinancialMetricGroup {
  title: string;
  metrics: CompanyMetric[];
}

export interface CompanyFinancialSnapshot {
  symbol: string;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  evEbitda: number | null;
  dividendYield: number | null;
  eps: number | null;
  bookValue: number | null;
  roe: number | null;
  roa: number | null;
  roic: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  revenueGrowth: number | null;
  profitGrowth: number | null;
  epsGrowth: number | null;
  sales: number | null;
  netProfit: number | null;
}

export interface RatioInterpretation {
  peInterpretation: string | null;
  pbInterpretation: string | null;
  evEbitdaInterpretation: string | null;
  dividendInterpretation: string | null;
  valuationSummary: string | null;
}

export function interpretValuation(pe: number | null, pb: number | null, evEbitda: number | null): string | null {
  const hints: string[] = [];
  if (pe !== null) {
    if (pe > 40) hints.push("P/E appears elevated relative to typical value ranges");
    else if (pe > 25) hints.push("P/E is moderately above typical value ranges");
    else if (pe > 10) hints.push("P/E is within a typical value range");
    else if (pe > 0) hints.push("P/E is below typical value ranges");
  }
  if (pb !== null) {
    if (pb > 5) hints.push("P/B suggests a premium market assessment");
    else if (pb > 2) hints.push("P/B is moderately above book value");
    else if (pb >= 0) hints.push("P/B is within a typical range");
  }
  if (evEbitda !== null) {
    if (evEbitda > 25) hints.push("EV/EBITDA appears elevated");
    else if (evEbitda > 12) hints.push("EV/EBITDA is moderately above typical");
    else if (evEbitda >= 0) hints.push("EV/EBITDA is within a typical range");
  }
  if (hints.length === 0) return "Valuation context is limited for this company";
  return hints.join("; ");
}

export function interpretMargin(margin: number | null, label: string): string | null {
  if (margin === null) return null;
  if (margin > 0.3) return `${label} is strong`;
  if (margin > 0.15) return `${label} is healthy`;
  if (margin > 0.05) return `${label} is moderate`;
  if (margin > 0) return `${label} is thin`;
  return `${label} is negative`;
}

export function formatRatio(val: number | null): string | null {
  if (val === null) return null;
  if (!Number.isFinite(val)) return null;
  return val.toFixed(2);
}

export function formatPercent(val: number | null): string | null {
  if (val === null) return null;
  if (!Number.isFinite(val)) return null;
  return `${(val * 100).toFixed(1)}%`;
}

export function formatCurrency(val: number | null): string | null {
  if (val === null) return null;
  if (!Number.isFinite(val)) return null;
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export function buildFinancialGroups(snapshot: CompanyFinancialSnapshot | null): FinancialMetricGroup[] {
  if (!snapshot) return [];

  const groups: FinancialMetricGroup[] = [];

  const profitability: CompanyMetric[] = [];
  if (snapshot.grossMargin !== null) profitability.push({ label: "Gross margin", value: snapshot.grossMargin, unit: "percent", interpretation: interpretMargin(snapshot.grossMargin, "Gross margin"), isPositive: snapshot.grossMargin > 0 });
  if (snapshot.operatingMargin !== null) profitability.push({ label: "Operating margin", value: snapshot.operatingMargin, unit: "percent", interpretation: interpretMargin(snapshot.operatingMargin, "Operating margin"), isPositive: snapshot.operatingMargin > 0 });
  if (snapshot.netMargin !== null) profitability.push({ label: "Net margin", value: snapshot.netMargin, unit: "percent", interpretation: interpretMargin(snapshot.netMargin, "Net margin"), isPositive: snapshot.netMargin > 0 });
  if (snapshot.roe !== null) profitability.push({ label: "ROE", value: snapshot.roe, unit: "percent", interpretation: snapshot.roe > 15 ? "ROE indicates efficient capital use" : snapshot.roe > 8 ? "ROE is moderate" : "ROE is below typical benchmarks", isPositive: snapshot.roe > 0 });
  if (snapshot.roic !== null) profitability.push({ label: "ROIC", value: snapshot.roic, unit: "percent", interpretation: snapshot.roic > 15 ? "ROIC suggests strong capital allocation" : snapshot.roic > 8 ? "ROIC is moderate" : "ROIC is below typical benchmarks", isPositive: snapshot.roic > 0 });
  if (profitability.length > 0) groups.push({ title: "Profitability & efficiency", metrics: profitability });

  const valuation: CompanyMetric[] = [];
  if (snapshot.peRatio !== null) valuation.push({ label: "P/E", value: snapshot.peRatio, unit: "multiple", interpretation: null, isPositive: snapshot.peRatio > 0 });
  if (snapshot.pbRatio !== null) valuation.push({ label: "P/B", value: snapshot.pbRatio, unit: "multiple", interpretation: null, isPositive: snapshot.pbRatio > 0 });
  if (snapshot.evEbitda !== null) valuation.push({ label: "EV/EBITDA", value: snapshot.evEbitda, unit: "multiple", interpretation: null, isPositive: snapshot.evEbitda > 0 });
  if (snapshot.dividendYield !== null) valuation.push({ label: "Div yield", value: snapshot.dividendYield, unit: "percent", interpretation: null, isPositive: snapshot.dividendYield > 0 });
  if (valuation.length > 0) groups.push({ title: "Valuation", metrics: valuation });

  const growth: CompanyMetric[] = [];
  if (snapshot.revenueGrowth !== null) growth.push({ label: "Revenue growth", value: snapshot.revenueGrowth, unit: "percent", interpretation: snapshot.revenueGrowth > 0.1 ? "Revenue growth is strong" : snapshot.revenueGrowth > 0 ? "Revenue is growing modestly" : "Revenue is declining", isPositive: snapshot.revenueGrowth > 0 });
  if (snapshot.profitGrowth !== null) growth.push({ label: "Profit growth", value: snapshot.profitGrowth, unit: "percent", interpretation: snapshot.profitGrowth > 0.1 ? "Profit growth is strong" : snapshot.profitGrowth > 0 ? "Profit is growing modestly" : "Profit is declining", isPositive: snapshot.profitGrowth > 0 });
  if (snapshot.epsGrowth !== null) growth.push({ label: "EPS growth", value: snapshot.epsGrowth, unit: "percent", interpretation: snapshot.epsGrowth > 0.1 ? "EPS growth is strong" : snapshot.epsGrowth > 0 ? "EPS is growing modestly" : "EPS is declining", isPositive: snapshot.epsGrowth > 0 });
  if (growth.length > 0) groups.push({ title: "Growth", metrics: growth });

  const financialHealth: CompanyMetric[] = [];
  if (snapshot.debtToEquity !== null) financialHealth.push({ label: "Debt/Equity", value: snapshot.debtToEquity, unit: "ratio", interpretation: snapshot.debtToEquity > 1.5 ? "Debt level is elevated" : snapshot.debtToEquity > 0.5 ? "Moderate debt level" : "Low debt relative to equity", isPositive: snapshot.debtToEquity < 1 });
  if (snapshot.currentRatio !== null) financialHealth.push({ label: "Current ratio", value: snapshot.currentRatio, unit: "ratio", interpretation: snapshot.currentRatio > 2 ? "Strong short-term liquidity" : snapshot.currentRatio > 1 ? "Adequate liquidity" : "Liquidity may need review", isPositive: snapshot.currentRatio > 1 });
  if (financialHealth.length > 0) groups.push({ title: "Financial health", metrics: financialHealth });

  return groups;
}
