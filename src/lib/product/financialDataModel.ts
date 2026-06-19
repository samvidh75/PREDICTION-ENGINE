export interface FinancialMetric {
  label: string;
  value: number | null;
  format: "number" | "percent" | "ratio" | "currency" | "tabular";
  suffix?: string;
  prefix?: string;
}

export interface FinancialMetricGroup {
  title: string;
  metrics: FinancialMetric[];
}

export interface ValuationContext {
  peRatio: FinancialMetric | null;
  pbRatio: FinancialMetric | null;
  evEbitda: FinancialMetric | null;
  dividendYield: FinancialMetric | null;
  interpretation: string | null;
}

export interface RiskContext {
  debtToEquity: FinancialMetric | null;
  currentRatio: FinancialMetric | null;
  volatilityRisk: string | null;
  keyRiskFlags: string[];
  overallRisk: string | null;
}

export interface CompanyFinancialSnapshot {
  groups: FinancialMetricGroup[];
  valuation: ValuationContext | null;
  risk: RiskContext | null;
  peerCount: number;
  historyPoints: number;
  completenessScore: number;
}

export function formatMetricValue(metric: FinancialMetric): string {
  if (metric.value === null || metric.value === undefined) return "";
  const val = metric.format === "percent"
    ? `${(metric.value * 100).toFixed(2)}%`
    : metric.format === "currency"
      ? `₹${metric.value.toLocaleString("en-IN")}`
      : metric.format === "ratio"
        ? metric.value.toFixed(2)
        : metric.format === "tabular"
          ? String(Math.round(metric.value))
          : metric.value.toLocaleString("en-IN");

  return `${metric.prefix ?? ""}${val}${metric.suffix ?? ""}`;
}

export function formatINR(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export function formatPercentValue(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const sign = value >= 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(2)}%`;
}

export function interpretPeRatio(pe: number | null): string | null {
  if (pe === null) return null;
  if (pe < 0) return "Earnings negative — standard P/E not applicable";
  if (pe < 15) return "Below-market valuation relative to earnings";
  if (pe < 25) return "Moderate valuation relative to earnings";
  if (pe < 40) return "Above-market valuation relative to earnings";
  return "Premium valuation relative to earnings";
}

export function interpretPbRatio(pb: number | null): string | null {
  if (pb === null) return null;
  if (pb < 1) return "Trading below book value";
  if (pb < 3) return "Moderate valuation relative to book value";
  if (pb < 5) return "Above-average valuation relative to book value";
  return "Premium valuation relative to book value";
}

export function interpretDividendYield(dy: number | null): string | null {
  if (dy === null) return null;
  if (dy > 0.04) return "Above-average income yield";
  if (dy > 0.02) return "Moderate income yield";
  if (dy > 0) return "Income yield below market average";
  return "No dividend yield";
}

export function interpretRiskScore(score: number | null): string | null {
  if (score === null) return null;
  if (score >= 70) return "Lower risk profile";
  if (score >= 50) return "Moderate risk profile";
  if (score >= 35) return "Elevated risk profile";
  return "Higher risk profile — review before continuing";
}

// === Pre-existing model functions ===

export interface RawFinancialData {
  symbol: string;
  marketCap?: number | null;
  peRatio?: number | null;
  pbRatio?: number | null;
  evEbitda?: number | null;
  dividendYield?: number | null;
  eps?: number | null;
  bookValue?: number | null;
  roe?: number | null;
  roa?: number | null;
  roic?: number | null;
  debtToEquity?: number | null;
  currentRatio?: number | null;
  grossMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  revenueGrowth?: number | null;
  profitGrowth?: number | null;
  epsGrowth?: number | null;
  sales?: number | null;
  netProfit?: number | null;
  [key: string]: unknown;
}

export function formatRatio(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value.toFixed(2);
}

export function formatPercent(value: number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return `${(value * 100).toFixed(1)}%`;
}

export function formatCurrency(value: number | null | undefined): string | null {
  return formatINR(value);
}

export function interpretValuation(
  pe: number | null | undefined,
  pb: number | null | undefined,
  _evEbitda?: number | null | undefined,
): string {
  if (pe !== null && pe !== undefined && pe > 0) {
    if (pe > 40) return "P/E suggests an elevated valuation relative to earnings.";
    if (pe > 25) return "P/E is moderately above typical market levels.";
    if (pe < 12) return "P/E is below typical market levels.";
  }
  if (pb !== null && pb !== undefined && pb > 0) {
    if (pb > 5) return "P/B suggests a premium valuation relative to book value.";
    if (pb > 3) return "P/B is above average relative to book value.";
  }
  return "Valuation context is limited for this company.";
}

export function interpretMargin(margin: number | null | undefined, label: string): string | null {
  if (margin === null || margin === undefined) return null;
  if (margin > 0.3) return `${label} is strong.`;
  if (margin > 0.15) return `${label} is healthy.`;
  if (margin > 0) return `${label} is modest.`;
  return `${label} is negative.`;
}

export function buildFinancialGroups(data: RawFinancialData | null): FinancialMetricGroup[] {
  if (!data) return [];
  const groups: FinancialMetricGroup[] = [];

  const profitability: FinancialMetric[] = [];
  if (data.grossMargin != null) profitability.push({ label: "Gross Margin", value: data.grossMargin, format: "percent" });
  if (data.operatingMargin != null) profitability.push({ label: "Operating Margin", value: data.operatingMargin, format: "percent" });
  if (data.netMargin != null) profitability.push({ label: "Net Margin", value: data.netMargin, format: "percent" });
  if (data.roe != null) profitability.push({ label: "ROE", value: data.roe, format: "percent" });
  if (data.roa != null) profitability.push({ label: "ROA", value: data.roa, format: "percent" });
  if (data.roic != null) profitability.push({ label: "ROIC", value: data.roic, format: "percent" });
  if (profitability.length > 0) groups.push({ title: "Profitability", metrics: profitability });

  const growth: FinancialMetric[] = [];
  if (data.revenueGrowth != null) growth.push({ label: "Revenue Growth", value: data.revenueGrowth, format: "percent" });
  if (data.profitGrowth != null) growth.push({ label: "Profit Growth", value: data.profitGrowth, format: "percent" });
  if (data.epsGrowth != null) growth.push({ label: "EPS Growth", value: data.epsGrowth, format: "percent" });
  if (growth.length > 0) groups.push({ title: "Growth", metrics: growth });

  const valuation: FinancialMetric[] = [];
  if (data.peRatio != null) valuation.push({ label: "P/E", value: data.peRatio, format: "ratio" });
  if (data.pbRatio != null) valuation.push({ label: "P/B", value: data.pbRatio, format: "ratio" });
  if (data.evEbitda != null) valuation.push({ label: "EV/EBITDA", value: data.evEbitda, format: "ratio" });
  if (data.dividendYield != null) valuation.push({ label: "Dividend Yield", value: data.dividendYield, format: "percent" });
  if (valuation.length > 0) groups.push({ title: "Valuation", metrics: valuation });

  const financials: FinancialMetric[] = [];
  if (data.sales != null) financials.push({ label: "Revenue", value: data.sales, format: "currency" });
  if (data.netProfit != null) financials.push({ label: "Net Profit", value: data.netProfit, format: "currency" });
  if (data.eps != null) financials.push({ label: "EPS", value: data.eps, format: "tabular" });
  if (data.bookValue != null) financials.push({ label: "Book Value", value: data.bookValue, format: "currency" });
  if (data.marketCap != null) financials.push({ label: "Market Cap", value: data.marketCap, format: "currency" });
  if (financials.length > 0) groups.push({ title: "Financials", metrics: financials });

  const health: FinancialMetric[] = [];
  if (data.debtToEquity != null) health.push({ label: "Debt/Equity", value: data.debtToEquity, format: "ratio" });
  if (data.currentRatio != null) health.push({ label: "Current Ratio", value: data.currentRatio, format: "ratio" });
  if (health.length > 0) groups.push({ title: "Financial Health", metrics: health });

  return groups;
}
